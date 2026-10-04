"use client"

import { useState, Suspense, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { UserType } from "@/enums/userType"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Stepper,
    StepperContent,
    StepperItem,
    StepperNav,
    StepperTrigger,
    StepperIndicator,
    StepperTitle,
    StepperDescription,
    StepperSeparator,
    StepperPanel
} from "@/components/reui/stepper"
import { CheckIcon, LoaderCircleIcon, CheckCircle2, Mail, Pencil, Check, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import GradientButton from "@/components/ui/gradiant-button"
import ArtistProfileForm from "./ArtistProfileForm"
import { useAuthStore } from "@/store/useAuthStore"
import { useUserStore } from "@/store/useUserStore"
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn"
import { useAppleSignIn } from "@/hooks/useAppleSignIn"
import { toast } from "sonner"

const formSchema = z.object({
    firstName: z.string().trim().min(1, { message: "First name is required." }),
    lastName: z.string().trim().min(1, { message: "Last name is required." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    user_type: z.nativeEnum(UserType).default(UserType.COLLECTOR),
})

// The page remounts once auth state settles (Suspense + search params), which
// used to wipe what the user had typed. Keep an in-tab draft so it survives.
const SIGNUP_DRAFT_KEY = "crestox_signup_draft";
type SignupDraft = { firstName?: string; lastName?: string; email?: string };

function readSignupDraft(): SignupDraft {
    if (typeof window === "undefined") return {};
    try {
        return JSON.parse(window.sessionStorage.getItem(SIGNUP_DRAFT_KEY) ?? "{}") as SignupDraft;
    } catch {
        return {};
    }
}

function writeSignupDraft(draft: SignupDraft) {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(SIGNUP_DRAFT_KEY, JSON.stringify(draft));
    } catch {
        // Storage unavailable (private mode): the form still works without a draft.
    }
}

function clearSignupDraft() {
    if (typeof window === "undefined") return;
    try {
        window.sessionStorage.removeItem(SIGNUP_DRAFT_KEY);
    } catch {
        // ignore
    }
}

function SignupFormContent() {
    const { requestMagicLink, isLoading, isSuccess, isExistingUser, magicLinkMessage, error, appleSignIn, clearStore } = useAuthStore()
    const [activeStep, setActiveStep] = useState(1);
    const [appleLoading, setAppleLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    // `isSuccess` lives in the global auth store, so it would otherwise persist when
    // navigating between /signup and /login and show a stale success screen (with a
    // blank email, since the new form has no value). Reset it on mount.
    useEffect(() => {
        clearStore();
        setIsEditing(false);
    }, [clearStore]);

    const searchParams = useSearchParams();

    const rawType = searchParams.get("user_type");
    const userType = Object.values(UserType).includes(rawType as UserType)
        ? (rawType as UserType)
        : UserType.COLLECTOR;
    const emailFromLogin = searchParams.get("email");
    const redirectedFromLogin = searchParams.get("from") === "login";

    const { triggerGoogleSignIn } = useGoogleSignIn({
        intent: 'signup',
        userType,
    });

    const handleAppleSuccess = async (data: { idToken: string; authorizationCode: string; name?: string }) => {
        setAppleLoading(true);
        try {
            const result = await appleSignIn(data.idToken, data.authorizationCode, data.name, userType, "signup");
            if (result && "accessToken" in result && result.accessToken) {
                void useUserStore.getState().initialize();
                toast.success("Successfully signed up with Apple!");
                if (result.isNewArtist && userType === UserType.ARTIST) {
                    router.push("/onboarding/artist");
                } else if (result.isNewCurator && userType === UserType.CURATOR) {
                    router.push("/onboarding/curator");
                } else if (result.isNewOwner && userType === UserType.OWNER) {
                    router.push("/onboarding/owner");
                } else if (result.isNewCollector) {
                    router.push("/explore");
                } else {
                    router.push("/");
                }
            }
        } catch (err) {
            console.error("Apple sign-in error:", err);
            toast.error("Failed to sign up with Apple");
        } finally {
            setAppleLoading(false);
        }
    };

    const { triggerAppleSignIn } = useAppleSignIn({
        onSuccess: handleAppleSuccess,
        onError: (error) => {
            toast.error(error);
            setAppleLoading(false);
        },
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: emailFromLogin ?? "",
            user_type: userType,
        },
        mode: "onChange"
    })

    // Restore the draft after a remount, then keep it up to date while typing.
    useEffect(() => {
        const draft = readSignupDraft();
        if (draft.firstName && !form.getValues("firstName")) form.setValue("firstName", draft.firstName);
        if (draft.lastName && !form.getValues("lastName")) form.setValue("lastName", draft.lastName);
        if (draft.email && !emailFromLogin && !form.getValues("email")) form.setValue("email", draft.email);
        const sub = form.watch((v) => {
            writeSignupDraft({ firstName: v.firstName, lastName: v.lastName, email: v.email });
        });
        return () => sub.unsubscribe();
    }, [form, emailFromLogin]);

    useEffect(() => {
        if (!emailFromLogin) return;
        form.setValue("email", emailFromLogin);
        if (redirectedFromLogin) {
            toast.info("Enter your first and last name to continue — your email will be confirmed on the next step.");
        }
    }, [emailFromLogin, redirectedFromLogin, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const name = `${values.firstName} ${values.lastName}`.trim();
        await requestMagicLink(values.email, name, values.user_type);
        clearSignupDraft();
        // Re-using this handler for the "edit email" flow on the success screen:
        // once the link is re-sent with the updated email, drop back to the sent view.
        setIsEditing(false);
    }

    const nextStep = async () => {
        let isValid = false;
        if (activeStep === 1) {
            isValid = await form.trigger(["firstName", "lastName"]);
        } else if (activeStep === 2) {
            isValid = await form.trigger("email");
        }

        if (isValid) {
            setActiveStep((prev) => Math.min(prev + 1, 2));
        }
    };

    const prevStep = () => {
        setActiveStep((prev) => Math.max(prev - 1, 1));
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <Card className="w-full max-w-lg border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="space-y-1 text-center pb-2">
                    <CardTitle className="text-2xl font-serif">
                        {userType === UserType.ARTIST
                            ? "Join as an Artist"
                            : userType === UserType.CURATOR
                                ? "Join as a Curator"
                                : userType === UserType.OWNER
                                    ? "Join as an Owner"
                                    : "Create Your Collector Account"}
                    </CardTitle>
                    <CardDescription className="font-sans">
                        {isSuccess
                            ? isExistingUser
                                ? "We found an account with this email and sent you a sign-in link."
                                : "Check your email for the verification link."
                            : redirectedFromLogin
                                ? "Enter your name, then confirm your email to finish signing up"
                                : "Create your account in 2 simple steps"
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {isSuccess ? (
                        !isEditing ? (
                            <div className="flex flex-col items-center justify-center space-y-6 py-8">
                                {isExistingUser && (
                                    <Alert className="w-full border-primary/30 bg-primary/5 text-left">
                                        <Info className="h-4 w-4 text-primary" />
                                        <AlertTitle className="text-foreground">Account already exists</AlertTitle>
                                        <AlertDescription className="text-muted-foreground">
                                            {magicLinkMessage ||
                                                "This email is already registered. We are logging you in — check your inbox for a sign-in link sent to your email."}
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <CheckCircle2 className="h-16 w-16 text-primary" />
                                <div className="text-center text-[17px] text-muted-foreground w-full">
                                    {isExistingUser
                                        ? "We've sent a sign-in link to"
                                        : "We've sent a secure verification link to"}
                                </div>
                                <div className="flex items-center space-x-3 text-[19px]">
                                    <Mail className="h-6 w-6 text-primary shrink-0" />
                                    <span className="font-semibold tracking-wide text-foreground break-all">{form.getValues("email")}</span>
                                    <button type="button" onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-foreground transition-colors ml-2 shrink-0">
                                        <Pencil className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="text-center text-[15px] text-muted-foreground mt-4">
                                    Please check your inbox. Didn't get the email? Check spam or edit your email.
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center space-y-8 py-4">
                                <div className="rounded-full border-[3px] border-primary p-3 mb-2 flex items-center justify-center h-16 w-16 bg-background">
                                    <Check className="h-8 w-8 text-primary" strokeWidth={3} />
                                </div>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full max-w-sm">
                                        <FormField
                                            control={form.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Input placeholder="m@example.com" {...field} disabled={isLoading} className="bg-transparent border-input text-[15px] h-12 rounded-lg pl-4" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="flex items-center justify-center space-x-4 pt-2">
                                            <Button
                                                type="submit"
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 h-11 rounded-lg"
                                                disabled={isLoading}
                                            >
                                                {isLoading ? "Updating..." : "Update Email"}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={() => setIsEditing(false)}
                                                disabled={isLoading}
                                                className="text-muted-foreground hover:text-foreground px-6 h-11 rounded-lg"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                        {error && (
                                            <div className="text-sm font-medium text-destructive mt-2 text-center">
                                                {error}
                                            </div>
                                        )}
                                    </form>
                                </Form>
                            </div>
                        )
                    ) : (
                        <>
                            {redirectedFromLogin && emailFromLogin && (
                                <Alert className="mb-6 border-primary/30 bg-primary/5 text-left">
                                    <Info className="h-4 w-4 text-primary" />
                                    <AlertTitle className="text-foreground">No account found</AlertTitle>
                                    <AlertDescription className="text-muted-foreground">
                                        <span className="font-medium text-foreground">{emailFromLogin}</span> is not
                                        registered yet. Please enter your first and last name below, then confirm
                                        your email on the next step.
                                    </AlertDescription>
                                </Alert>
                            )}
                            <Stepper
                                value={activeStep}
                                onValueChange={setActiveStep}
                                orientation="vertical"
                                className="flex flex-col items-center justify-center gap-10"
                                indicators={{
                                    completed: (
                                        <CheckIcon className="size-3.5" />
                                    ),
                                    loading: (
                                        <LoaderCircleIcon className="size-3.5 animate-spin" />
                                    ),
                                }}
                            >

                                <StepperPanel className="flex w-full">
                                    <StepperNav className="justify-center items-center mt-5 gap-2 me-3">
                                        <StepperItem step={1} completed={activeStep > 1}>
                                            <StepperTrigger onClick={() => { if (activeStep > 1) setActiveStep(1) }}>
                                                <StepperIndicator className="data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground">
                                                    1
                                                </StepperIndicator>
                                            </StepperTrigger>
                                            <StepperSeparator className="group-data-[state=completed]/step:bg-primary" />
                                        </StepperItem>

                                        <StepperItem step={2} completed={activeStep > 2}>
                                            <StepperTrigger onClick={async () => {
                                                if (activeStep > 2) {
                                                    setActiveStep(2)
                                                } else if (activeStep === 1) {
                                                    const isValid = await form.trigger(["firstName", "lastName"]);
                                                    if (isValid) setActiveStep(2);
                                                }
                                            }}>
                                                <StepperIndicator className="data-[state=completed]:bg-primary data-[state=completed]:text-primary-foreground">
                                                    2
                                                </StepperIndicator>
                                            </StepperTrigger>
                                        </StepperItem>
                                    </StepperNav>

                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 min-h-[200px] flex flex-col w-full">
                                            <StepperContent value={1} className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name="firstName"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>First name</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Max" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                    <FormField
                                                        control={form.control}
                                                        name="lastName"
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Last name</FormLabel>
                                                                <FormControl>
                                                                    <Input placeholder="Robinson" {...field} />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </StepperContent>

                                            <StepperContent value={2} className="space-y-4">
                                                {redirectedFromLogin && emailFromLogin && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Confirm the email you tried to sign in with, or update it if
                                                        needed.
                                                    </p>
                                                )}
                                                <FormField
                                                    control={form.control}
                                                    name="email"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Email</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="m@example.com" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </StepperContent>

                                            <div className="flex justify-between !mt-[50px]">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={prevStep}
                                                    disabled={activeStep === 1}
                                                    className={`rounded-lg ${activeStep === 1 ? "opacity-0" : ""}`}
                                                >
                                                    Back
                                                </Button>

                                                {activeStep < 2 ? (
                                                    <GradientButton
                                                        type="button"
                                                        onClick={nextStep}

                                                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                                        label="Next"
                                                    >
                                                    </GradientButton>
                                                ) : (
                                                    <div className="flex flex-col w-full text-right items-end gap-2">
                                                        <GradientButton
                                                            type="submit"
                                                            className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                                            label={isLoading ? "Loading..." : "Create "}
                                                            onClick={form.handleSubmit(onSubmit)}
                                                            disabled={isLoading}
                                                        />
                                                        {error && (
                                                            <span className="text-sm text-destructive">{error}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </form>
                                    </Form>
                                </StepperPanel>
                            </Stepper>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    type="button"
                                    onClick={triggerGoogleSignIn}
                                    disabled={appleLoading || isLoading}
                                >
                                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                                    </svg>
                                    Sign up with Google
                                </Button>

                                {/* <Button 
                                    variant="outline" 
                                    className="w-full" 
                                    type="button"
                                    onClick={triggerAppleSignIn}
                                    disabled={googleLoading || appleLoading || isLoading}
                                >
                                    {appleLoading ? (
                                        <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
                                            <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                                        </svg>
                                    )}
                                    {appleLoading ? "Signing up..." : "Sign up with Apple"}
                                </Button> */}
                            </div>
                        </>
                    )}
                </CardContent>
                <CardFooter className="justify-center pb-6 border-t pt-6 bg-muted/20">
                    <div className="text-sm text-muted-foreground font-sans">
                        Already have an account?{" "}
                        <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                            Login
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}

export default function SignupPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <SignupFormContent />
        </Suspense>
    )
}
