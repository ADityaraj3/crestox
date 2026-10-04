"use client"

import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PlusCircle, Upload, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import GradientButton from "@/components/ui/gradiant-button"
import { createArtwork } from "@/apis/artwork/artworkActions"
import { uploadMediaFiles } from "@/apis/media/mediaActions"

const mediaItemSchema = z.object({
    media_id: z.number().int().positive(),
    file_path: z.string(),
})

// Dimensions are stored with 2 decimals (e.g. 45.5 cm); the server rejects more.
const dimension = (label: string) =>
    z
        .number({ invalid_type_error: `${label} is required.` })
        .min(0.01, { message: `${label} must be greater than 0.` })
        .max(100000, { message: `${label} looks too large (max 100,000).` })
        .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, {
            message: `${label} can have at most 2 decimals.`,
        })

// The artwork is always created in the signed-in user's own portfolio; the
// server derives the profile, so the form no longer sends artist_profile_id.
const artworkFormSchema = z.object({
    name: z.string().trim().min(1, { message: "Artwork name is required." }),
    description: z.string().trim().min(1, { message: "Description is required." }),
    media: z.array(mediaItemSchema).min(1, { message: "At least one photo is required." }),
    materials_used: z.string().trim().min(1, { message: "Materials used is required." }),
    height: dimension("Height"),
    length: dimension("Length"),
    breadth: dimension("Breadth"),
    dimensions_unit: z.enum(["cm", "inches", "m", "ft"], {
        required_error: "Please select a unit.",
    }),
    number_of_shares: z
        .number()
        .int()
        .min(1, { message: "Number of parts must be at least 1." })
        .max(10000, { message: "An artwork can have at most 10,000 parts." }),
    starting_price: z.number().min(0.01, { message: "Starting price must be greater than 0." }),
})

type ArtworkFormValues = z.infer<typeof artworkFormSchema>

interface ArtworkFormProps {
    onSubmit?: (values: ArtworkFormValues) => void | Promise<void>
}

export default function ArtworkForm({ onSubmit }: ArtworkFormProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const router = useRouter()

    const form = useForm<ArtworkFormValues>({
        resolver: zodResolver(artworkFormSchema),
        defaultValues: {
            name: "",
            description: "",
            media: [] as { media_id: number; file_path: string }[],
            materials_used: "",
            height: 0,
            length: 0,
            breadth: 0,
            dimensions_unit: "cm",
            number_of_shares: 100,
            starting_price: 0,
        },
    })

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const fileList = Array.from(files)
        setIsUploading(true)
        try {
            const response = await uploadMediaFiles(fileList)()
            const currentMedia = form.getValues("media") || []
            const newItems = response.data.map((item) => ({
                media_id: parseInt(String(item.media_id), 10),
                file_path: item.file_path,
            }))

            if (newItems.length === 0) return

            if (index !== undefined) {
                const updated = [...currentMedia]
                updated[index] = newItems[0]
                form.setValue("media", updated, { shouldValidate: true })
            } else {
                // Validating here clears "At least one photo is required." as
                // soon as a photo is added, not only on the next submit.
                form.setValue("media", [...currentMedia, ...newItems], { shouldValidate: true })
            }
        } catch (err: any) {
            const errorMessage = err?.response?.data?.message || "Failed to upload images. Please try again."
            toast.error("Upload failed", { description: errorMessage })
        } finally {
            setIsUploading(false)
            e.target.value = ""
        }
    }

    const removePhoto = (index: number) => {
        const currentMedia = form.getValues("media") || []
        const updated = currentMedia.filter((_, i) => i !== index)
        form.setValue("media", updated)
    }

    async function handleSubmit(values: ArtworkFormValues) {
        setIsSubmitting(true)
        try {
            const mediaIds = values.media.map((m) => parseInt(String(m.media_id), 10))
            const payload = {
                ...values,
                media: mediaIds.map((media_id, i) => ({
                    media_id,
                    display_order: i,
                    is_primary: i === 0,
                })),
                demensions_unit: values.dimensions_unit,
            }
            delete (payload as any).dimensions_unit

            await createArtwork(payload)()

            toast.success("Artwork created successfully!", {
                description: `${values.name} has been added to your portfolio.`,
            })

            if (onSubmit) {
                await onSubmit(values)
            }

            form.reset()
            router.push("/portfolio")
        } catch (err: any) {
            // Handle error
            const errorMessage = err?.response?.data?.message || "Failed to create artwork. Please try again."
            toast.error("Error creating artwork", {
                description: errorMessage,
            })
            console.error("Error creating artwork:", err)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card className="w-full max-w-4xl border-border/50 bg-card/50 backdrop-blur-sm mx-auto">
            <CardHeader className="space-y-1 pb-6">
                <CardTitle className="text-2xl font-serif">Add New Artwork</CardTitle>
                <CardDescription className="font-sans">
                    Create a new artwork listing for your portfolio. Fill in all the details to get started.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                        {/* Artwork Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Artwork Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Sunset Over Mountains" {...field} />
                                    </FormControl>
                                    <FormDescription>Give your artwork a memorable name.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Describe your artwork, its inspiration, and what makes it unique..."
                                            className="min-h-[120px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormDescription>Share the story behind your artwork.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Photo Uploads */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="media"
                                render={() => (
                                    <FormItem className="space-y-0">
                                        <FormLabel className="text-base text-foreground/90">Photos</FormLabel>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {form.watch("media")?.map((item, index) => (
                                <div key={`${item.media_id}-${index}`} className="p-4 border border-border/40 rounded-lg space-y-4 relative group">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            {item.file_path && (
                                                <div className="mb-4">
                                                    <img
                                                        src={item.file_path}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-48 object-cover rounded-md border border-border/50"
                                                    />
                                                </div>
                                            )}
                                            <div className="relative">
                                                <div className="flex items-center gap-2 border border-input bg-background/50 px-3 py-2 rounded-md h-10 text-sm overflow-hidden text-muted-foreground w-full cursor-pointer hover:bg-background/70 transition-colors"
                                                    onClick={() => {
                                                        const input = document.getElementById(`photo-input-${index}`)
                                                        input?.click()
                                                    }}
                                                >
                                                    <Upload className="w-4 h-4 shrink-0" />
                                                    <span className="font-semibold text-foreground shrink-0">Choose file</span>
                                                    <span className="truncate text-muted-foreground">
                                                        Image {index + 1}
                                                    </span>
                                                </div>
                                                <Input
                                                    id={`photo-input-${index}`}
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => handlePhotoUpload(e, index)}
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                                            onClick={() => removePhoto(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    className="gap-2 font-sans"
                                    disabled={isUploading}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    {isUploading ? "Uploading..." : "Add Photo"}
                                </Button>
                                {/* Kept in the DOM: some browsers ignore clicks on detached file inputs. */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => handlePhotoUpload(e)}
                                />
                            </div>
                        </div>

                        {/* Materials Used */}
                        <FormField
                            control={form.control}
                            name="materials_used"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Materials Used</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Oil on canvas" {...field} />
                                    </FormControl>
                                    <FormDescription>Specify the materials and medium used.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Dimensions */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <FormField
                                control={form.control}
                                name="height"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Height</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="100"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="length"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Length</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="80"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="breadth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Breadth</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="5"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="dimensions_unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select unit" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="cm">cm</SelectItem>
                                                <SelectItem value="inches">inches</SelectItem>
                                                <SelectItem value="m">m</SelectItem>
                                                <SelectItem value="ft">ft</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Parts and Pricing */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="number_of_shares"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Number of Parts</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="100"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription>Total number of fractional parts available.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="starting_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Starting Price (₹)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-sans">₹</span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="100"
                                                    className="pl-7"
                                                    {...field}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormDescription>Starting price per part.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="pt-4">
                            <GradientButton
                                type="submit"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8"
                                label={isSubmitting ? "Creating..." : "Create Artwork"}
                                disabled={isSubmitting}
                            />
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}