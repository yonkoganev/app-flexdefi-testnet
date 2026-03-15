import { formatEther } from "viem";
import { blue, grey, red } from "@mui/material/colors";
import { Box, Grid, Typography } from "@mui/material";
import { useGetGlobals } from "../web3/hooks/useGetGlobals";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { day_length, launchTimestamp } from "@/constants/TimestampLaunch";
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import { useGetBalanceOfBFLEX } from "../web3/hooks/useGetBalanceOfBFLEX";
import { borderColor, cardColor } from "@/constants/colors";

const StakeStats = ({ amount, days, irrevocable }) => {
    // web3
    const { data: globals } = useGetGlobals();
    const { data: bFLEXbalance } = useGetBalanceOfBFLEX();

    function dayToTime() {
        const secondsInDay = day_length;
        const finalTimestamp = launchTimestamp / 1000 + days * secondsInDay;
        const date = new Date(finalTimestamp * 1000);
        const day = date.getDate();
        const month = date.toLocaleString("en-US", { month: "short" });
        const year = date.getFullYear();
        const suffix =
            day % 10 === 1 && day !== 11 ? 'st' :
            day % 10 === 2 && day !== 12 ? 'nd' :
            day % 10 === 3 && day !== 13 ? 'rd' :
            'th';
        return `${month} ${day}${suffix}, ${year}`;
    }

    function handleGlobals() {
        if (!globals) {
            return { staked: null, shares: null, sharePrice: null };
        }
        const sharePrice = Number(formatEther(globals?.[2]));
        return { sharePrice }
    }
    const { sharePrice } = handleGlobals();

    function fSharesUI() {
        if (!amount || !days || !sharePrice) return null;

        // --- Time bonus (protocol logic) ---
        const y = Math.floor(days / 365);
        const weightedDays = (y * (y + 1) / 2) * 365 + (days - y * 365) * (y + 1);

        const timeBonus = weightedDays / 7300;

        // --- Base shares (NO bFLEX, NO irrevocable) ---
        let baseShares = amount / sharePrice;
        baseShares *= 1 + timeBonus;

        // --- Final shares (with bonuses) ---
        const hasBFLEX = bFLEXbalance > 0;
        let finalShares = amount / (hasBFLEX ? sharePrice * 0.20 : sharePrice);
        finalShares *= 1 + timeBonus;

        if (irrevocable) finalShares *= 1.25;

        // --- Bonus only ---
        const bonusShares = amount === 0 || !amount || amount === null ? 0 : finalShares - baseShares;
        
        return {
            final: finalShares,
            bonus: bonusShares
        };
    }

    const result = fSharesUI();
    const final = result ? result.final : 0;
    const bonus = result ? result.bonus : 0;

    return(
        <Grid
            size={{ lg: 4, md: 5.8, sm: 12, xs: 12 }}
            sx={{
                p: 2,
                border: 1,
                borderRadius: 1,
                background: cardColor,
                borderColor: borderColor
            }}
        >
            {/* Staking Panel */}
            <Box
                sx={{
                    p: 3,
                    border: 1,
                    width: '100%',
                    height: '100%',
                    borderRadius: 1,
                    borderColor: borderColor
                }}
            >
                <Grid container gap={1} display="flex" alignItems="center" justifyContent="space-between">
                    <Typography color={grey[50]} fontSize={28} fontWeight={600}>Stake details</Typography>
                    <Grid container width="100%" gap={1} display="flex" alignItems="center" mt={1}>
                        <Typography color={grey[300]} fontWeight={550} display="flex" alignItems="center">
                            bFLEX:
                        </Typography>
                        {Number(bFLEXbalance ?? 0n) > 0 ?
                            <CheckCircleIcon style={{ color:'#69f0ae', fontSize: 22 }} />
                            :
                            <CancelOutlinedIcon style={{ color: red[400] }} />
                        }
                    </Grid>
                    <Grid container width="100%" gap={1} display="flex" alignItems="center">
                        <Typography color={grey[300]} fontWeight={550} display="flex" alignItems="center">
                            Irrevocable:
                        </Typography>
                        {irrevocable ?
                            <CheckCircleIcon style={{ color:'#69f0ae', fontSize: 22 }} />
                            :
                            <CancelOutlinedIcon style={{ color: red[400] }} />
                        }
                    </Grid>
                    <Typography color={grey[300]} fontWeight={550}>
                        FLEX amount:
                        <span style={{ color: blue[100], fontWeight: 600, marginLeft: 5 }}>
                            {Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                        </span>
                    </Typography>
                    <Typography color={grey[300]} fontWeight={550} width="100%">
                        Estimated fShares: <span style={{ color: blue[100], fontWeight: 600 }}>~{final.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span> <span style={{ color: grey[300] }}>fShares</span>
                    </Typography>
                    <Typography color={grey[300]} fontWeight={550}>
                        Expiry date: <span style={{ color: grey[50], fontWeight: 600 }}>{dayToTime()}</span>
                    </Typography>
                    <Typography color={grey[300]} fontWeight={550}>
                        fShares bonus: <span style={{ color: blue[100], fontWeight: 600 }}>{bonus.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span> fShares
                        ({bonus === 0 ? '0.00' : (bonus / (final - bonus) * 100).toFixed(2)}%)
                    </Typography>
                    <Typography color={grey[400]} mt={2} fontSize={13}>
                        Tip: Longer staking periods and holding <span style={{ color: blue[100], fontWeight: 900 }}>bFLEX</span> increase
                        fShares, resulting in <span style={{ color: blue[100], fontWeight: 900 }}>higher</span> APR. Irrevocable stakes
                        earn bonus fShares but must be held until maturity.
                    </Typography>
                </Grid>
            </Box>
        </Grid>
    );
};

export default StakeStats;
