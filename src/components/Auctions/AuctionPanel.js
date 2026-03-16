import { useEffect, useState } from "react";
import { parseEther, formatEther } from "viem";
import { blue, grey } from "@mui/material/colors";
import { flexContracts } from "../web3/contracts";
import MissingWalletBox from "../MissingWalletBox";
import { useAccount, usePublicClient } from "wagmi";
import { useApprove } from "../web3/hooks/useApprove";
import { useDonateUSDT } from "../web3/hooks/useDonateUSDT";
import { useGetCurrentDay } from "../web3/hooks/useGetCurrentDay";
import { useGetBalanceOfUSDT } from "../web3/hooks/useGetBalanceOfUSDT";
import { Box, Button, Grid, TextField, Typography } from "@mui/material";
import RejectedTransactionModal from "../Modals/RejectedTransactionModal";
import { useGetHasContributed } from "../web3/hooks/useGetHasContributed";
import SubmittedTransactionModal from "../Modals/SubmittedTransactionModal";
import { useGetAllowanceAuction } from "../web3/hooks/useGetAllowanceAuction";
import SuccessfullTransactionModal from "../Modals/SuccessfulTransactionModal";
import { useGetAuctionStatsOfDay } from "../web3/hooks/useGetAuctionStatsOfDay";
import { useGetDonatorAccountCount } from "../web3/hooks/useGetDonatorAccountCount";
import { borderColor, cardColor, lightCardColor } from "@/constants/colors";

const flexPerDay = [20000000, 14000000, 9000000];

const AuctionPanel = () => {
    // web3
    const { address } = useAccount();
    const { approve } = useApprove();
    const { donate } = useDonateUSDT();
    const publicClient = usePublicClient();
    const { data: currentDay, refetch: refetchDay } = useGetCurrentDay();
    const { data: usdtBalance, refetch: refetchBalance } = useGetBalanceOfUSDT();
    const { data: allowance, refetch: refetchAllowance } = useGetAllowanceAuction();
    const { data: donators, refetch: refetchDonators } = useGetDonatorAccountCount({ day: currentDay ? currentDay : 0 });
    const { data: auctionStats, refetch: refetchStats } = useGetAuctionStatsOfDay({ day: currentDay ? currentDay : 0 });
    const { data: hasContributed, refetch: refetchHasContributed } = useGetHasContributed({ day: currentDay && currentDay });

    //Modals
    const [modalSuccess, setModalSuccess] = useState(false);
    const [modalRejection, setModalRejection] = useState(false);
    const [modalSubmitted, setModalSubmitted] = useState(false);

    const dailyDeduction = 13000;
    const [amount, setAmount] = useState(0);
    const [isDisabled, setIsDisabled] = useState(false);
    const [buttonText, setButtonText] = useState('Contribute USDT');

    const [isActive, setIsActive] = useState(false);
    const [isActiveText, setIsActiveText] = useState('');

    const handleChange = (e) => {
        const value = e.target.value;
        if (value === "") {
            setAmount("");
            setIsDisabled(true);
            setButtonText("Enter USDT amount");
            return;
        }
        const floatVal = parseFloat(value);
        
        if (isNaN(floatVal)) {
            setAmount(value);
            setIsDisabled(true);
            setButtonText("USDT must be greater than 50");
            return;
        }

        try {
            parseEther(value); // Validate format
        } catch (err) {
            setButtonText("Invalid number");
            setIsDisabled(true);
            return;
        }
        
        setAmount(value);
        setIsDisabled(false);
        setButtonText("Contribute USDT");
    };

    const handleApproveAndContribute = async () => {
        const amountstr = parseEther(amount.toString());
        if (BigInt(amountstr) > BigInt(allowance || 0)) {
            try {
                const tx = await approve(flexContracts.auctions, amountstr); 
                setModalSubmitted(true);
                setButtonText('Approving...');
                setIsDisabled(true);
                const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
                setModalSubmitted(false);
                if (receipt.status !== 'success') {
                    setModalRejection(true); // Show "Transaction Failed" modal
                    return;
                }
                setIsDisabled(false);
                setModalSuccess(true); // Show success modal
                refetch()
                setButtonText('Contribute USDT');
                return;
            } catch (err) {
                setModalSubmitted(false);
                if (err?.message?.includes('User rejected') || err?.shortMessage?.includes('User rejected')) {
                    console.warn("User rejected approval transaction.");
                } else {
                    console.error("Approval tx error:", err);
                }
                setModalRejection(true);
                setButtonText('Approve');
                return;
            }
        }
        try {
            const amountWei = parseEther(amount);
            const txHash = await donate(amountWei); 
            console.log('TX Hash:', txHash);
            setModalSubmitted(true);
            setButtonText('Contributing...');
            setIsDisabled(true);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
            setModalSubmitted(false);

            if (receipt.status !== 'success') {
                setModalRejection(true);
                return;
            }
            refetch()
            setModalSuccess(true);
            setIsDisabled(false);
            setButtonText('Contribute USDT');
        } catch (error) {
            setModalSubmitted(false);
            if (error?.message?.includes('User rejected') || error?.shortMessage?.includes('User rejected')) {
                console.warn("User rejected stake transaction.");
            } else {
                console.error("Stake tx error:", error);
            }
            setModalRejection(true);
            setButtonText('Contribute USDT');
        }
    };

    function calculateDailyFlex() {
        if (!currentDay) return;
        if (currentDay < 4) {
            const day = currentDay ? currentDay - 1 : 0;
            const flexAmount = Number(flexPerDay[day]).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
            return flexAmount
        } else {
            const flexAmount = Number(flexPerDay[2] - currentDay * dailyDeduction).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
            return flexAmount
        }
    }

    function calculateDailyRatio() {
        let ratio;
        if (currentDay < 4) {
            const flexAmount = Number(flexPerDay[0]);
            ratio = auctionStats ? flexAmount / formatEther(auctionStats[1]) : 0;
            if (ratio > 1000000000) {
                const flexAmount = Number(flexPerDay[currentDay - 1]);
                return flexAmount
            }
            return ratio
        } else {
            const flexAmount = Number(flexPerDay[2] - currentDay * dailyDeduction);
            const ratio = auctionStats ? (flexAmount / formatEther(auctionStats[1])) : 0;
            if (ratio > 1000000000) {
                const flexAmount = Number(flexPerDay[2] - currentDay * dailyDeduction);
                return flexAmount;
            }
            return ratio
        }
    }

    function calculateMyShare(amount) {
        if (!auctionStats) return;
        if (currentDay === 0) return 0;
        if ((!amount && hasContributed === 0) || (amount <= 0 && hasContributed <= 0)) return `0.00`;
        const hasContributedformmatted = Number(formatEther(hasContributed ?? 0n));
        const formattedAmount = Number(amount);
        const contributed = Number(formatEther(auctionStats[1]));
        const preDay4 = Number(flexPerDay[currentDay - 1]);
        const postDay4 = Number(flexPerDay[2] - currentDay * dailyDeduction);
        const flexAmount = currentDay < 4 ? preDay4 : postDay4;
        const toGet = (formattedAmount / (contributed + formattedAmount)) * flexAmount;
        const alreadyContributedFinal = ((hasContributedformmatted / contributed) * flexAmount);
        if (hasContributedformmatted === 0) {
            return toGet.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        } else return alreadyContributedFinal.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    }

    const refetch = async () => {
        await Promise.all([
            refetchDay(),
            refetchStats(),
            refetchBalance(),
            refetchDonators(),
            refetchAllowance(),
            refetchHasContributed()
        ]);
    };

    useEffect(() => {
        const amountstr = amount.toString();
        if (hasContributed > 0) {
            setIsDisabled(true);
            setButtonText("Already contributed");
        } else if (Number(parseEther(amountstr)) > parseEther('50000')) {
            setButtonText('Max. 50K USDT');
        } else if (parseEther(amountstr) > usdtBalance) {
            setButtonText('Insufficient USDT balance');
        } else if (parseEther(amountstr) > allowance) {
            setButtonText('Approve');
        }

        if (currentDay < 1) {
            setIsActive(false);
            setIsActiveText('Auctions start on Day 1');
        } else if (currentDay > 150) {
            setIsActive(false);
            setIsActiveText('Auctions have ended on Day 150');
        }
    }, [amount, allowance, usdtBalance, hasContributed, currentDay]);

    return(
        <Grid
            size={{ lg: 4, md: 6, sm: 12, xs: 12 }}
            sx={{
                p: 2,
                border: 1,
                borderRadius: 1,
                mt: isActive ? 0 : 5,
                mb: isActive ? 0 : 2,
                background: cardColor,
                borderColor: borderColor
            }}
        >
            {address ?
                (
                    /* Staking Panel */
                    <Box
                        sx={{
                            p: 3,
                            border: 1,
                            width: '100%',
                            borderRadius: 1,
                            borderColor: borderColor
                        }}
                    >
                        <Typography color={grey[50]} fontSize={28} fontWeight={600}>Auction #{currentDay}</Typography>
                        <Typography color={grey[400]} mt={1} fontSize={13}>
                            Contribute USDT to the daily auctions, reserve your <span style={{ color: blue[100], fontWeight: 600 }}>FLEX</span> portion
                            and claim on the next day as a <span style={{ color: blue[100], fontWeight: 600 }}>stake</span> or liquid.
                        </Typography>
                        <Typography color={grey[400]} mt={2} fontSize={13}>
                            Available tokens for today`s auction: <span style={{ color: blue[100], fontWeight: 600 }}>{calculateDailyFlex()} FLEX</span>
                        </Typography>
                        <Typography color={grey[400]} mt={2} fontSize={13}>
                            Contributed USDT in the current day:
                            <span style={{ color: blue[100], fontWeight: 600, marginLeft: 5 }}>
                                {auctionStats ? Number(formatEther(auctionStats[1])).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : 0.00} USDT
                            </span>
                        </Typography>
                        <Typography color={grey[400]} mt={2} fontSize={13}>
                            Total contributors for today&apos;s auction:
                            <span style={{ color: blue[100], fontWeight: 600, marginLeft: 5 }}>
                                {donators && currentDay ? donators : 0}
                            </span>
                        </Typography>
                        <Typography color={grey[400]} mt={2} fontSize={13}>
                            Current ratio (FLEX per 1 USDT):
                            <span style={{ color: blue[100], fontWeight: 600, marginLeft: 5 }}>
                                {auctionStats ? Number(calculateDailyRatio()).toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : 0} FLEX
                            </span>
                        </Typography>
                        <Grid container width="100%" mt={2}>
                            <TextField
                                onChange={(e) => handleChange(e)}
                                type="number"
                                size="small"
                                placeholder="Enter USDT amount to contribute"
                                inputProps={{
                                inputMode: "numeric",
                                pattern: "[0-9]*",
                                }}
                                sx={{
                                flexGrow: 1,
                                borderRadius: 1,
                                backgroundColor: lightCardColor,
                                "& .MuiInputBase-input": {
                                    height: 35,
                                    padding: "0 10px",
                                    lineHeight: "35px",
                                    color: grey[50],
                                    fontWeight: 900,
                                },
                        
                                /* Remove arrows (Chrome, Safari, Edge) */
                                "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button": {
                                    WebkitAppearance: "none",
                                    margin: 0,
                                },
                                "& input[type=number]": {
                                    MozAppearance: "textfield", // Firefox
                                },
                                ':hover': { borderColor: 'transparent' },
                                "& .MuiOutlinedInput-notchedOutline": {
                                    borderColor: "transparent",
                                },
                                "&:hover .MuiOutlinedInput-notchedOutline": {
                                    borderColor: 'transparent',
                                },
                                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                    borderColor: 'transparent',
                                },
                                }}
                            />
                        </Grid>
                        <Typography color={grey[400]} mt={2} fontSize={13} mb={1}>
                            At the current rate you will get: <span style={{ color: blue[100], fontWeight: 600 }}>{calculateMyShare(amount)} FLEX</span>
                        </Typography>
                        <Button
                            disabled={isDisabled}
                            onClick={() => handleApproveAndContribute()}
                            fullWidth
                            sx={{
                                mt: 1,
                                height: 35,
                                fontWeight: 550,
                                borderRadius: 1,
                                color: grey[50],
                                textTransform: 'none',
                                background: `linear-gradient(to right, ${blue[900]}, ${blue[500]})`,
                                ':disabled': { background: grey[700], color: grey[300] }
                            }}
                        >
                            {buttonText}
                        </Button>
                    </Box>
                ) : (
                    <MissingWalletBox />
                )
            }
            <SuccessfullTransactionModal open={modalSuccess} setOpen={setModalSuccess} />
            <RejectedTransactionModal open={modalRejection} setOpen={setModalRejection} />
            <SubmittedTransactionModal open={modalSubmitted} setOpen={setModalSubmitted} />
        </Grid>
    );
};

export default AuctionPanel;
