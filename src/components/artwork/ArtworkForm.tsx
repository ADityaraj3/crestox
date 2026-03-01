"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { PlusCircle, Upload, Trash2 } from "lucide-react"

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

const artworkFormSchema = z.object({
    name: z.string().min(1, { message: "Artwork name is required." }),
    description: z.string().min(1, { message: "Description is required." }),
    photo_urls: z.array(z.string()).min(1, { message: "At least one photo is required." }),
    materials_used: z.string().min(1, { message: "Materials used is required." }),
    height: z.number().min(0.1, { message: "Height must be greater than 0." }),
    length: z.number().min(0.1, { message: "Length must be greater than 0." }),
    breadth: z.number().min(0.1, { message: "Breadth must be greater than 0." }),
    dimensions_unit: z.enum(["cm", "inches", "m", "ft"], {
        required_error: "Please select a unit.",
    }),
    artist_profile_id: z.number().int().positive(),
    number_of_shares: z.number().int().min(1, { message: "Number of shares must be at least 1." }),
    starting_price: z.number().min(0.01, { message: "Starting price must be greater than 0." }),
})

type ArtworkFormValues = z.infer<typeof artworkFormSchema>

interface ArtworkFormProps {
    artistProfileId: number
    onSubmit?: (values: ArtworkFormValues) => void | Promise<void>
}
 
export default function ArtworkForm({ artistProfileId, onSubmit }: ArtworkFormProps) {
    const [photoFiles, setPhotoFiles] = useState<File[]>([])

    const form = useForm<ArtworkFormValues>({
        resolver: zodResolver(artworkFormSchema),
        defaultValues: {
            name: "",
            description: "",
            photo_urls: [] as string[],
            materials_used: "",
            height: 0,
            length: 0,
            breadth: 0,
            dimensions_unit: "cm",
            artist_profile_id: artistProfileId,
            number_of_shares: 100,
            starting_price: 0,
        },
    })

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        Array.from(files).forEach((file) => {
            const reader = new FileReader()
            reader.onloadend = () => {
                const result = reader.result as string
                const currentPhotos = form.getValues("photo_urls") || []
                if (index !== undefined) {
                    const updated = [...currentPhotos]
                    updated[index] = result
                    form.setValue("photo_urls", updated)
                    const updatedFiles = [...photoFiles]
                    updatedFiles[index] = file
                    setPhotoFiles(updatedFiles)
                } else {
                    form.setValue("photo_urls", [...currentPhotos, result])
                    setPhotoFiles((prev) => [...prev, file])
                }
            }
            reader.readAsDataURL(file)
        })
    }

    const removePhoto = (index: number) => {
        const currentPhotos = form.getValues("photo_urls") || []
        const updated = currentPhotos.filter((_, i) => i !== index)
        form.setValue("photo_urls", updated)
        setPhotoFiles((prev) => prev.filter((_, i) => i !== index))
    }

    async function handleSubmit(values: ArtworkFormValues) {
        console.log("Artwork submitted:", values)
        if (onSubmit) {
            await onSubmit(values)
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
                            <FormLabel className="text-base text-foreground/90">Photos</FormLabel>
                            {form.watch("photo_urls")?.map((photoUrl, index) => (
                                <div key={index} className="p-4 border border-border/40 rounded-lg space-y-4 relative group">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            {photoUrl && (
                                                <div className="mb-4">
                                                    <img
                                                        src={photoUrl}
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
                                                        {photoFiles[index]?.name || "No file chosen"}
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
                                    onClick={() => {
                                        const input = document.createElement("input")
                                        input.type = "file"
                                        input.accept = "image/*"
                                        input.multiple = true
                                        input.onchange = (e) => handlePhotoUpload(e as any)
                                        input.click()
                                    }}
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    Add Photo
                                </Button>
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
                                                step="0.1"
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
                                                step="0.1"
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
                                                step="0.1"
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

                        {/* Shares and Pricing */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="number_of_shares"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Number of Shares</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="100"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormDescription>Total number of fractional shares available.</FormDescription>
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
                                        <FormDescription>Starting price per share.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="pt-4">
                            <GradientButton
                                type="submit"
                                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8"
                                label="Create Artwork"
                            />
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}
