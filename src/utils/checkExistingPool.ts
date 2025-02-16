import { PoolFetchType } from '@raydium-io/raydium-sdk-v2';
import { initSdk } from '../raydium';

// This is only for mainnet
export async function checkExistingPool(token1Mint: string, token2Mint: string = 'So11111111111111111111111111111111111111112') {
    try {
        const raydium = await initSdk();
        const poolInfo = await raydium.api.fetchPoolByMints({
            mint1: token1Mint,
            mint2: token2Mint,
        });
        console.log(poolInfo);
        if (poolInfo.data && poolInfo.data.length > 0) {
            console.log('Pool exists:', poolInfo.data[0]);
            return poolInfo.data[0];
        } else {
            console.log('Pool does not exist.');
            return null;
        }
    } catch (error) {
        console.error('Error checking pool:', error);
        throw error;
    }
}

export async function fetchPoolById(id: string) {
    const raydium = await initSdk();
    const poolInfo = await raydium.api.fetchPoolById({
        ids: id,
    });
    console.log(poolInfo);
    return poolInfo;
}

// Usage example:
checkExistingPool('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
fetchPoolById('4Yw4p37E3ABQuSzL78UYMqjsY6cMAvdYuCzQXQTvUAJ6');