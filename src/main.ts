import {TypeormDatabase} from '@subsquid/typeorm-store'
import {processor} from './processor'
import assert from 'assert'

type YearData = {
    eoySupply: bigint,
    eoySupplyNoNull: bigint,
    seconds: number
}

const data: Map<number, YearData> = new Map()

let currentYear: number | null = null
let currentYearData: YearData | undefined
let firstTimestamp: number | undefined
let firstBlock: number | undefined


processor.run(new TypeormDatabase({supportHotBlocks: false}), async (ctx) => {
    for (let block of ctx.blocks) {
        assert(block.header.timestamp!=null)
        let timestamp = block.header.height===0 ? 1438269973000 : block.header.timestamp
        let newCurrentYear = (new Date(timestamp)).getFullYear()
        if (newCurrentYear !== currentYear) {
            if (currentYear !== null && currentYearData !== undefined) {
                data.set(currentYear, currentYearData)
                console.log(`Happy new year ${newCurrentYear}! The datas are`)
                console.log(data)
            }
            else {
                console.log(`Starting at ${newCurrentYear}`)
                console.log({firstTimestamp: timestamp, firstBlock: block.header.height})
            }
            currentYear = newCurrentYear
            currentYearData = { eoySupply: 0n, eoySupplyNoNull: 0n, seconds: 0 }
            firstTimestamp = timestamp
            firstBlock = block.header.height
        }
        assert(currentYear!==null)
        assert(currentYearData!==undefined)
        assert(firstTimestamp!==undefined)
        assert(firstBlock!==undefined)
        currentYearData.seconds = timestamp - firstTimestamp

        for (let std of block.stateDiffs) {
            if (std.key !== 'balance') continue
            switch (std.kind) {
                case '+':
                    currentYearData.eoySupply += BigInt(std.next)
                    break
                case '-':
                    currentYearData.eoySupply -= BigInt(std.prev)
                    break
                case '*':
                    currentYearData.eoySupply -= BigInt(std.prev)
                    currentYearData.eoySupply += BigInt(std.next)
                    break
                default:
                    break
            }
            if (std.address !== '0x0000000000000000000000000000000000000000') {
                switch (std.kind) {
                    case '+':
                        currentYearData.eoySupplyNoNull += BigInt(std.next)
                        break
                    case '-':
                        currentYearData.eoySupplyNoNull -= BigInt(std.prev)
                        break
                    case '*':
                        currentYearData.eoySupplyNoNull -= BigInt(std.prev)
                        currentYearData.eoySupplyNoNull += BigInt(std.next)
                        break
                    default:
                        break
                }
            }
        }
    }

    if (currentYear === 2024) {
        console.log(`Latest data:`)
        console.log(data)
    }
})
