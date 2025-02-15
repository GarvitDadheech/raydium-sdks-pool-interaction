import {
    DEVNET_PROGRAM_ID,
    getCpmmPdaAmmConfigId,
} from '@raydium-io/raydium-sdk-v2'
import { NATIVE_MINT, createAssociatedTokenAccountInstruction, createSyncNativeInstruction, getAssociatedTokenAddress, getMint } from '@solana/spl-token'
import { SystemProgram, Transaction, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
import { initSdk, txVersion, owner, connection } from './raydium'

const LAMPORTS_PER_SOL = 1000000000

async function wrapSol(amountOfSol: number) {
    try {
        const associatedTokenAccount = await getAssociatedTokenAddress(
            NATIVE_MINT,
            owner.publicKey
        )

        // Check if account exists and has balance
        try {
            const balance = await connection.getTokenAccountBalance(associatedTokenAccount)
            if (balance?.value?.uiAmount !== null && balance?.value?.uiAmount !== undefined) {
                const transferTx = new Transaction().add(
                    SystemProgram.transfer({
                        fromPubkey: owner.publicKey,
                        toPubkey: associatedTokenAccount,
                        lamports: amountOfSol * LAMPORTS_PER_SOL,
                    })
                )
                await connection.sendTransaction(transferTx, [owner])
                return associatedTokenAccount
            }
        } catch (e) {
            // Account doesn't exist, create it
            const wrapTx = new Transaction().add(
                createAssociatedTokenAccountInstruction(
                    owner.publicKey,
                    associatedTokenAccount,
                    owner.publicKey,
                    NATIVE_MINT
                ),
                SystemProgram.transfer({
                    fromPubkey: owner.publicKey,
                    toPubkey: associatedTokenAccount,
                    lamports: amountOfSol * LAMPORTS_PER_SOL,
                }),
                createSyncNativeInstruction(associatedTokenAccount)
            )
            await connection.sendTransaction(wrapTx, [owner])
        }
        console.log("✅ SOL wrapped successfully")
        return associatedTokenAccount
    } catch (error) {
        console.error("Error wrapping SOL:", error)
        throw error
    }
}

export const createPool = async () => {
    try {
        console.log('Creating pool...')
        const raydium = await initSdk({ loadToken: true })
        
        // Get token info through Raydium SDK instead of direct mint fetch
        const mintA = await raydium.token.getTokenInfo('So11111111111111111111111111111111111111112') // SOL
        const mintB = await raydium.token.getTokenInfo('<Mint Address of Your Token>')

        const token1Amount = 0.001 // Amount in SOL
        const token2Amount = 100 // Amount in token

        // If using SOL, wrap it first
        if (mintA.address === NATIVE_MINT.toBase58()) {
            await wrapSol(token1Amount)
        }

        const mintAAmount = new BN(token1Amount * 10 ** mintA.decimals)
        const mintBAmount = new BN(token2Amount * 10 ** mintB.decimals)

        const feeConfigs = await raydium.api.getCpmmConfigs()

        if (raydium.cluster === 'devnet') {
            feeConfigs.forEach((config) => {
                config.id = getCpmmPdaAmmConfigId(DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM, config.index).publicKey.toBase58()
            })
        }

        const { execute, extInfo } = await raydium.cpmm.createPool({
            programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
            poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
            mintA,
            mintB,
            mintAAmount,
            mintBAmount,
            startTime: new BN(0),
            feeConfig: feeConfigs[0],
            associatedOnly: false,
            ownerInfo: {
                useSOLBalance: true,
            },
            txVersion,
            computeBudgetConfig: {
                units: 400000,
                microLamports: 50000
            },
        })

        console.log('Executing transaction...')
        const { txId } = await execute({ sendAndConfirm: true })
        
        console.log('Pool created successfully', {
            txId,
            poolKeys: Object.keys(extInfo.address).reduce(
                (acc, cur) => ({
                    ...acc,
                    [cur]: extInfo.address[cur as keyof typeof extInfo.address].toString(),
                }),
                {}
            ),
        })
    } catch (error) {
        console.error('Failed to create pool:', error)
        throw error
    }
}

createPool()