"use client"

import { useEffect, useState, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getCookie } from "@/utils/cookieUtils"
import { setReturnTo } from "@/utils/returnTo"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoaderCircleIcon, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import {
    getPriceApproval,
    respondToPriceApproval,
    type PriceApprovalDetails,
} from "@/apis/artwork/artworkActions"

function formatInr(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0)
}

function statusMessage(status: PriceApprovalDetails["status"]): string {
    switch (status) {
        case "APPROVED":
            return "You have already approved this price change. Your artwork is approved and listed at the new price."
        case "REJECTED":
            return "You have already rejected this price change. The artwork has been sent back to the Crestox team for review."
        case "SUPERSEDED":
            return "This price request is no longer valid because a newer price was proposed. Please check your email for the latest request."
        case "EXPIRED":
            return "This price approval link has expired. Please contact the Crestox team."
        default:
            return "This price approval request is no longer open."
    }
}

function PriceApprovalContent() {
    const searchParams = useSearchParams()
    const token = searchParams.get("token")
    const initialAction = searchParams.get("action")

    const [loading, setLoading] = useState(true)
    const [details, setDetails] = useState<PriceApprovalDetails | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)

    const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null)
    const [result, setResult] = useState<{ status: "APPROVED" | "REJECTED"; message: string } | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)

    const router = useRouter()
    const [needsLogin, setNeedsLogin] = useState(false)

    const goToLogin = useCallback(() => {
        setReturnTo(`${window.location.pathname}${window.location.search}`)
        router.push("/login")
    }, [router])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            if (!token) {
                setLoading(false)
                return
            }
            // Only the artwork's owner may answer (QA finding M9): sign in first.
            if (!getCookie("token")?.trim()) {
                setNeedsLogin(true)
                setLoading(false)
                return
            }
            try {
                const data = await getPriceApproval(token)()
                if (!cancelled) setDetails(data)
            } catch (err: any) {
                if (!cancelled && err?.response?.status === 401) {
                    setNeedsLogin(true)
                } else if (!cancelled) {
                    setLoadError(
                        err?.response?.data?.message ??
                            "We couldn't find this price approval request. The link may be invalid."
                    )
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [token])

    const handleRespond = useCallback(
        async (action: "approve" | "reject") => {
            if (!token || submitting) return
            setSubmitting(action)
            setSubmitError(null)
            try {
                const res = await respondToPriceApproval(token, action)()
                setResult({ status: res.status, message: res.message })
            } catch (err: any) {
                setSubmitError(
                    err?.response?.data?.message ??
                        "Something went wrong while recording your response. Please try again."
                )
            } finally {
                setSubmitting(null)
            }
        },
        [token, submitting]
    )

    const renderBody = () => {
        if (needsLogin) {
            return (
                <div className="flex flex-col items-center space-y-4 text-center">
                    <AlertTriangle className="h-12 w-12 text-amber-500" />
                    <p className="text-muted-foreground">
                        Sign in with the account that owns this artwork to review the price change.
                    </p>
                    <Button onClick={goToLogin}>Sign in to continue</Button>
                </div>
            )
        }
        if (loading) {
            return (
                <div className="flex flex-col items-center space-y-4">
                    <LoaderCircleIcon className="h-16 w-16 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading your price update...</p>
                </div>
            )
        }

        if (!token) {
            return (
                <div className="flex flex-col items-center space-y-4">
                    <XCircle className="h-16 w-16 text-destructive" />
                    <p className="text-center font-medium text-destructive">
                        Invalid link. No approval token was provided.
                    </p>
                </div>
            )
        }

        if (loadError) {
            return (
                <div className="flex flex-col items-center space-y-4">
                    <XCircle className="h-16 w-16 text-destructive" />
                    <p className="text-center font-medium text-destructive">{loadError}</p>
                </div>
            )
        }

        // Response already submitted in this session
        if (result) {
            const approved = result.status === "APPROVED"
            return (
                <div className="flex flex-col items-center space-y-4">
                    {approved ? (
                        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                    ) : (
                        <AlertTriangle className="h-16 w-16 text-amber-500" />
                    )}
                    <p
                        className={`text-center font-medium ${
                            approved ? "text-emerald-500" : "text-amber-500"
                        }`}
                    >
                        {result.message}
                    </p>
                </div>
            )
        }

        // Request already resolved (not pending) before this visit
        if (details && details.status !== "PENDING") {
            const approved = details.status === "APPROVED"
            return (
                <div className="flex flex-col items-center space-y-4">
                    {approved ? (
                        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                    ) : (
                        <AlertTriangle className="h-16 w-16 text-amber-500" />
                    )}
                    <p className="text-center font-medium text-muted-foreground">
                        {statusMessage(details.status)}
                    </p>
                </div>
            )
        }

        if (!details) return null

        return (
            <div className="flex w-full flex-col space-y-6">
                <div className="space-y-1 text-center">
                    <p className="text-sm text-muted-foreground">Artwork</p>
                    <p className="text-lg font-semibold text-foreground">
                        {details.artwork_name ?? `#${details.artwork_id}`}
                    </p>
                </div>

                <div className="flex items-center justify-center gap-4 rounded-lg border border-border/60 bg-card/50 p-5">
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Current</p>
                        <p className="font-mono text-base text-muted-foreground line-through">
                            {formatInr(details.price_before)}
                        </p>
                    </div>
                    <span className="text-muted-foreground">&rarr;</span>
                    <div className="text-center">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Proposed</p>
                        <p className="font-mono text-xl font-semibold text-primary">
                            {formatInr(details.price_after)}
                        </p>
                    </div>
                </div>

                {details.notes && (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">Note from Crestox:</span>{" "}
                        {details.notes}
                    </div>
                )}

                <p className="text-center text-sm text-muted-foreground">
                    Approving accepts the new fractal price and your artwork will be approved and listed at
                    this price. Rejecting sends the artwork back to the Crestox team for review and the price
                    will not change.
                </p>

                {initialAction === "approve" && (
                    <p className="text-center text-xs text-primary">
                        You chose to approve. Confirm below.
                    </p>
                )}
                {initialAction === "reject" && (
                    <p className="text-center text-xs text-amber-500">
                        You chose to reject. Confirm below.
                    </p>
                )}

                {submitError && (
                    <p className="text-center text-sm font-medium text-destructive">{submitError}</p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                        variant="default"
                        className="flex-1"
                        disabled={submitting !== null}
                        onClick={() => handleRespond("approve")}
                    >
                        {submitting === "approve" ? (
                            <>
                                <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Approving...
                            </>
                        ) : (
                            "Approve new price"
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        disabled={submitting !== null}
                        onClick={() => handleRespond("reject")}
                    >
                        {submitting === "reject" ? (
                            <>
                                <LoaderCircleIcon className="h-4 w-4 animate-spin" /> Rejecting...
                            </>
                        ) : (
                            "Reject new price"
                        )}
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-lg border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center pb-6">
                    <CardTitle className="text-2xl font-serif">Fractal Price Update</CardTitle>
                    <CardDescription className="font-sans">
                        Review the price your artwork will be listed at
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-4">
                    {renderBody()}
                </CardContent>
            </Card>
        </div>
    )
}

export default function PriceApprovalPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center p-4">
                    <LoaderCircleIcon className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <PriceApprovalContent />
        </Suspense>
    )
}
