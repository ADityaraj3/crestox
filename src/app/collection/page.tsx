// "use client";

// import React, { useMemo, useState } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { useAppStore } from '@/store/useAppStore';
// import { SellModal } from '@/components/collection/SellModal';
// import { FeatureCarousel } from "@/components/ui/feature-carousel"
// import { DollarSign, BarChart3, TrendingDown, TrendingUp, Folder, Home, Eye, Download, ExternalLink, Star, X } from 'lucide-react';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';
// import SidePanel from '@/components/ui/side-panel';

// export default function CollectionPage() {
//   const { holdings, listings, watchlist, addDummyHoldings, createListing, cancelListing, addToWatchlist, removeFromWatchlist } = useAppStore();
//   const [sellModalOpen, setSellModalOpen] = useState(false);
//   const [selectedHolding, setSelectedHolding] = useState<string | null>(null);
//   const [open, setOpen] = useState(false)


//   const portfolioStats = useMemo(() => {
//     const totalValue = holdings.reduce((acc, h) => acc + (h.shardsAvailable * h.pricePerShard), 0);
//     const totalSpent = holdings.reduce((acc, h) => acc + h.purchasePrice, 0);
//     const gainLoss = totalValue - totalSpent;
//     const gainLossPercent = totalSpent > 0 ? (gainLoss / totalSpent) * 100 : 0;

//     return {
//       totalValue,
//       totalSpent,
//       gainLoss,
//       gainLossPercent,
//     };
//   }, [holdings]);

//   // Group holdings by artist
//   const holdingsByArtist = useMemo(() => {
//     const grouped: Record<string, typeof holdings> = {};
//     holdings.forEach(holding => {
//       if (!grouped[holding.artist]) {
//         grouped[holding.artist] = [];
//       }
//       grouped[holding.artist].push(holding);
//     });
//     return grouped;
//   }, [holdings]);

//   // Calculate stats per artist
//   const getArtistStats = (artistHoldings: typeof holdings) => {
//     const totalFractals = artistHoldings.reduce((acc, h) => acc + h.shardsOwned, 0);
//     const fractalsListed = artistHoldings.reduce((acc, h) => acc + (h.shardsOwned - h.shardsAvailable), 0);
//     const investedAmount = artistHoldings.reduce((acc, h) => acc + h.purchasePrice, 0);
//     const currentValue = artistHoldings.reduce((acc, h) => acc + (h.shardsAvailable * h.pricePerShard), 0);
//     const gainLoss = currentValue - investedAmount;


//     return {
//       totalFractals,
//       fractalsListed,
//       investedAmount,
//       currentValue,
//       gainLoss,
//     };
//   };

//   const handleSellClick = (artworkId: string) => {
//     setSelectedHolding(artworkId);
//     setSellModalOpen(true);
//   };

//   const handleConfirmSell = (quantity: number, price: number, sellingPeriod: number) => {
//     if (selectedHolding) {
//       createListing(selectedHolding, quantity, price, sellingPeriod);
//       setSelectedHolding(null);
//     }
//   };

//   const getDaysRemaining = (expiresAt: Date) => {
//     const now = new Date();
//     const diff = expiresAt.getTime() - now.getTime();
//     const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
//     return days > 0 ? days : 0;
//   };

//   const formatTimeRemaining = (expiresAt: Date) => {
//     const days = getDaysRemaining(expiresAt);
//     if (days === 0) return 'Expired';
//     if (days === 1) return 'in 1 day';
//     return `in ${days} days`;
//   };

//   const hasData = holdings.length > 0;
//   const selectedHoldingData = selectedHolding ? holdings.find(h => h.artworkId === selectedHolding) : null;

//   return (
//     <div className="min-h-screen bg-background text-foreground pt-24 pb-12 px-6">
//       {/* Noise Overlay */}
//       <div
//         className="fixed inset-0 pointer-events-none z-[100] opacity-[0.02]"
//         style={{
//           backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
//         }}
//       />

//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <div className="text-center mb-12">
//           <h1 className="font-serif text-4xl md:text-5xl font-medium mb-3">My Collection</h1>
//           <p className="text-muted-foreground font-sans text-sm md:text-base">
//             Track your fractal portfolio, manage holdings, and discover new art.
//           </p>
//         </div>

//         <section className="py-10">
//           <FeatureCarousel
//             title="How Crestox Works"
//             description="A simple, secure certificate workflow"
//             image={{
//               step1light1: "/images/step1-1.png",
//               step1light2: "/images/step1-2.png",
//               step2light1: "/images/step2-1.png",
//               step2light2: "/images/step2-2.png",
//               step3light: "/images/step3.png",
//               step4light: "/images/step4.png",
//               alt: "Feature carousel demo"
//             }}
//           />

//           <div className='my-5'>
//             <SidePanel
//               panelOpen={open}
//               handlePanelOpen={() => setOpen(!open)}
//               renderButton={(toggle) => (
//                 <Button onClick={toggle} className='rounded-lg'>
//                   {open ? "Close Panel" : "Open Panel"}
//                 </Button>
//               )}
//             >
//               <section className="py-10">
//                 <video controls preload="none">
//                   <source src="http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" type="video/mp4" />
//                   <track
//                     src="/path/to/captions.vtt"
//                     kind="subtitles"
//                     srcLang="en"
//                     label="English"
//                   />
//                   Your browser does not support the video tag.
//                 </video>
//               </section>
//             </SidePanel>
//           </div>
//         </section>

//         {!hasData ? (
//           /* Empty State */
//           <Card className="border-border bg-card/50 backdrop-blur-sm">
//             <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
//               <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
//                 <Folder className="w-10 h-10 text-muted-foreground" />
//               </div>
//               <h3 className="font-serif text-2xl mb-2">Your collection is empty</h3>
//               <p className="text-muted-foreground font-sans text-sm mb-8 max-w-md">
//                 Start building your portfolio by purchasing fractals from the marketplace.
//                 Each fractal represents a verified part of authentic artwork.
//               </p>
//               <Button onClick={addDummyHoldings} variant="default" size="lg">
//                 Add Sample Data
//               </Button>
//             </CardContent>
//           </Card>
//         ) : (
//           <>
//             {/* Summary Cards */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
//               {/* Portfolio Value */}
//               <Card className="border-border bg-card/50 backdrop-blur-sm">
//                 <CardHeader className="pb-3">
//                   <CardTitle className="text-sm font-mono text-muted-foreground tracking-widest uppercase">
//                     Current Value
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="text-2xl font-mono font-bold text-foreground">
//                         ₹{portfolioStats.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
//                       </p>
//                       <p className="text-xs text-muted-foreground font-sans mt-1">
//                         Current market value of holdings
//                       </p>
//                     </div>
//                     <DollarSign className="w-8 h-8 text-muted-foreground/50" />
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* Lifetime Investment */}
//               <Card className="border-border bg-card/50 backdrop-blur-sm">
//                 <CardHeader className="pb-3">
//                   <CardTitle className="text-sm font-mono text-muted-foreground tracking-widest uppercase">
//                     Lifetime Investment
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className="text-2xl font-mono font-bold text-foreground">
//                         ₹{portfolioStats.totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
//                       </p>
//                       <p className="text-xs text-muted-foreground font-sans mt-1">
//                         Includes all fees and taxes
//                       </p>
//                     </div>
//                     <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
//                   </div>
//                 </CardContent>
//               </Card>

//               {/* Gain/Loss */}
//               <Card className="border-border bg-card/50 backdrop-blur-sm">
//                 <CardHeader className="pb-3">
//                   <CardTitle className="text-sm font-mono text-muted-foreground tracking-widest uppercase">
//                     Gain/Loss
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent>
//                   <div className="flex items-center justify-between">
//                     <div>
//                       <p className={`text-2xl font-mono font-bold ${portfolioStats.gainLoss >= 0 ? 'text-primary' : 'text-destructive'}`}>
//                         ₹{portfolioStats.gainLoss.toLocaleString('en-IN', { maximumFractionDigits: 3, signDisplay: 'always' })}
//                       </p>
//                       <p className={`text-xs font-mono mt-1 ${portfolioStats.gainLossPercent >= 0 ? 'text-primary' : 'text-destructive'}`}>
//                         {portfolioStats.gainLossPercent >= 0 ? '+' : ''}{portfolioStats.gainLossPercent.toFixed(2)}% all time
//                       </p>
//                     </div>
//                     {portfolioStats.gainLoss >= 0 ? (
//                       <TrendingUp className="w-8 h-8 text-primary/50" />
//                     ) : (
//                       <TrendingDown className="w-8 h-8 text-destructive/50" />
//                     )}
//                   </div>
//                 </CardContent>
//               </Card>
//             </div>

//             {/* Tabs */}
//             <Tabs defaultValue="holdings" className="w-full">
//               <TabsList className="grid w-full grid-cols-3 bg-muted/50 border border-border">
//                 <TabsTrigger value="holdings" className="flex items-center gap-2">
//                   <Folder className="w-4 h-4" />
//                   My Holdings
//                 </TabsTrigger>
//                 <TabsTrigger value="listed" className="flex items-center gap-2">
//                   <Home className="w-4 h-4" />
//                   Listed for Sale
//                 </TabsTrigger>
//                 <TabsTrigger value="watchlist" className="flex items-center gap-2">
//                   <Eye className="w-4 h-4" />
//                   Watchlist
//                 </TabsTrigger>
//               </TabsList>

//               {/* My Holdings Tab */}
//               <TabsContent value="holdings" className="mt-6">
//                 {holdings.length === 0 ? (
//                   <Card className="border-border bg-card/50 backdrop-blur-sm">
//                     <CardContent className="flex flex-col items-center justify-center py-12 text-center">
//                       <p className="text-muted-foreground font-sans text-sm">
//                         No holdings yet. Start collecting fractals from the marketplace.
//                       </p>
//                     </CardContent>
//                   </Card>
//                 ) : (
//                   <div className="space-y-6">
//                     {Object.entries(holdingsByArtist).map(([artist, artistHoldings]) => {
//                       const stats = getArtistStats(artistHoldings);
//                       const roi = stats.investedAmount > 0 ? ((stats.currentValue - stats.investedAmount) / stats.investedAmount) * 100 : 0;

//                       return (
//                         <Card key={artist} className="border-border bg-card/50 backdrop-blur-sm">
//                           <CardContent className="p-6">
//                             {/* Artist Header */}
//                             <div className="mb-6 pb-4 border-b border-border">
//                               <h3 className="font-serif text-xl italic mb-2">{artist}</h3>
//                               <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
//                                 <div>
//                                   <p className="text-muted-foreground font-mono text-xs mb-1">Total Fractals Held</p>
//                                   <p className="text-foreground font-mono font-bold">{stats.totalFractals}</p>
//                                 </div>
//                                 <div>
//                                   <p className="text-muted-foreground font-mono text-xs mb-1">Fractals Listed for Sale</p>
//                                   <p className="text-foreground font-mono font-bold">{stats.fractalsListed}</p>
//                                 </div>
//                                 <div>
//                                   <p className="text-muted-foreground font-mono text-xs mb-1">Invested Amount (w/ GST)</p>
//                                   <p className="text-foreground font-mono font-bold">₹{(stats.investedAmount / 1000).toFixed(0)}K</p>
//                                 </div>
//                                 <div>
//                                   <p className="text-muted-foreground font-mono text-xs mb-1">Current Value</p>
//                                   <p className="text-foreground font-mono font-bold">₹{(stats.currentValue / 1000).toFixed(0)}K</p>
//                                 </div>
//                                 <div>
//                                   <p className="text-muted-foreground font-mono text-xs mb-1">Gain/Loss</p>
//                                   <p className={`font-mono font-bold ${stats.gainLoss >= 0 ? 'text-primary' : 'text-destructive'}`}>
//                                     {stats.gainLoss >= 0 ? '+' : ''}₹{(stats.gainLoss / 1000).toFixed(0)}K
//                                   </p>
//                                 </div>
//                               </div>
//                             </div>

//                             {/* Holdings List */}
//                             <div className="space-y-4">
//                               {artistHoldings.map((holding) => {
//                                 const holdingRoi = ((holding.currentValue - holding.purchasePrice) / holding.purchasePrice) * 100;

//                                 return (
//                                   <div key={holding.artworkId} className="flex flex-col md:flex-row gap-4 p-4 bg-background/50 rounded-lg border border-border/50">
//                                     <div className="w-full md:w-32 h-32 rounded-lg overflow-hidden border border-border bg-muted/30">
//                                       <img
//                                         src={holding.imageUrl}
//                                         alt={holding.artworkTitle}
//                                         className="w-full h-full object-cover"
//                                       />
//                                     </div>
//                                     <div className="flex-1">
//                                       <h4 className="font-serif text-lg italic mb-1">"{holding.artworkTitle}"</h4>
//                                       <div className="grid grid-cols-2 gap-4 mt-3">
//                                         <div>
//                                           <p className="text-muted-foreground font-mono text-xs mb-1">SHARDS</p>
//                                           <p className="text-foreground font-mono font-bold">
//                                             {holding.shardsAvailable} <span className="text-muted-foreground text-sm font-normal">/ {holding.shardsOwned}</span>
//                                           </p>
//                                         </div>
//                                         <div>
//                                           <p className="text-muted-foreground font-mono text-xs mb-1">CURRENT VALUE</p>
//                                           <p className="text-foreground font-mono font-bold">
//                                             ₹{((holding.shardsAvailable * holding.pricePerShard) / 1000).toFixed(0)}K
//                                           </p>
//                                         </div>
//                                       </div>
//                                     </div>
//                                     <div className="flex flex-col gap-2">
//                                       <Button
//                                         variant="outline"
//                                         size="sm"
//                                         className="flex items-center gap-2"
//                                         onClick={() => {/* Handle certificate download */ }}
//                                       >
//                                         <Download className="w-4 h-4" />
//                                         Certificate
//                                       </Button>
//                                       <Button
//                                         variant="default"
//                                         size="sm"
//                                         className="flex items-center gap-2"
//                                         onClick={() => handleSellClick(holding.artworkId)}
//                                         disabled={holding.shardsAvailable === 0}
//                                       >
//                                         <DollarSign className="w-4 h-4" />
//                                         Sell
//                                       </Button>
//                                       <Button
//                                         variant="ghost"
//                                         size="sm"
//                                         className="text-xs"
//                                         onClick={() => {
//                                           window.location.href = `/artist`;
//                                         }}
//                                       >
//                                         Artist Profile
//                                       </Button>
//                                     </div>
//                                   </div>
//                                 );
//                               })}
//                             </div>
//                           </CardContent>
//                         </Card>
//                       );
//                     })}
//                   </div>
//                 )}
//               </TabsContent>

//               {/* Listed for Sale Tab */}
//               <TabsContent value="listed" className="mt-6">
//                 {listings.length === 0 ? (
//                   <Card className="border-border bg-card/50 backdrop-blur-sm">
//                     <CardContent className="flex flex-col items-center justify-center py-12 text-center">
//                       <p className="text-muted-foreground font-sans text-sm">
//                         No listings yet. List your fractals for sale to start trading.
//                       </p>
//                     </CardContent>
//                   </Card>
//                 ) : (
//                   <Card className="border-border bg-card/50 backdrop-blur-sm">
//                     <CardContent className="p-0">
//                       <Table>
//                         <TableHeader>
//                           <TableRow>
//                             <TableHead className="font-mono">Artist</TableHead>
//                             <TableHead className="font-mono">Qty</TableHead>
//                             <TableHead className="font-mono">Price Range</TableHead>
//                             <TableHead className="font-mono">Current Price</TableHead>
//                             <TableHead className="font-mono">Ends In</TableHead>
//                             <TableHead className="font-mono text-right">Action</TableHead>
//                           </TableRow>
//                         </TableHeader>
//                         <TableBody>
//                           {listings.map((listing) => {
//                             // Calculate current price based on time elapsed (linear decrease)
//                             const now = new Date();
//                             const timeElapsed = now.getTime() - listing.createdAt.getTime();
//                             const totalTime = listing.expiresAt.getTime() - listing.createdAt.getTime();
//                             const progress = Math.min(1, Math.max(0, timeElapsed / totalTime));
//                             const minPrice = listing.listingPrice * 0.8; // 20% decrease over period
//                             const currentPrice = listing.listingPrice - (listing.listingPrice - minPrice) * progress;
//                             const isExpired = now > listing.expiresAt;

//                             return (
//                               <TableRow key={listing.id}>
//                                 <TableCell className="font-mono">{listing.artist}</TableCell>
//                                 <TableCell className="font-mono">{listing.quantity}</TableCell>
//                                 <TableCell className="font-mono">
//                                   ₹{minPrice.toFixed(2)} - ₹{listing.listingPrice.toFixed(2)}
//                                 </TableCell>
//                                 <TableCell className="font-mono font-bold">
//                                   ₹{isExpired ? minPrice.toFixed(2) : currentPrice.toFixed(2)}
//                                 </TableCell>
//                                 <TableCell className="font-mono">
//                                   {isExpired ? 'Expired' : formatTimeRemaining(listing.expiresAt)}
//                                 </TableCell>
//                                 <TableCell className="text-right">
//                                   <Button
//                                     variant="outline"
//                                     size="sm"
//                                     onClick={() => cancelListing(listing.id)}
//                                     className="font-mono"
//                                   >
//                                     Cancel
//                                   </Button>
//                                 </TableCell>
//                               </TableRow>
//                             );
//                           })}
//                         </TableBody>
//                       </Table>
//                     </CardContent>
//                   </Card>
//                 )}
//               </TabsContent>

//               {/* Watchlist Tab */}
//               <TabsContent value="watchlist" className="mt-6">
//                 {watchlist.length === 0 ? (
//                   <Card className="border-border bg-card/50 backdrop-blur-sm">
//                     <CardContent className="flex flex-col items-center justify-center py-12 text-center">
//                       <p className="text-muted-foreground font-sans text-sm">
//                         Your watchlist is empty. Add artists to track their performance.
//                       </p>
//                     </CardContent>
//                   </Card>
//                 ) : (
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                     {watchlist.map((artist) => (
//                       <Card key={artist.artistId} className="border-border bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors cursor-pointer">
//                         <CardContent className="p-6">
//                           <div className="flex items-start justify-between mb-4">
//                             <div>
//                               <h3 className="font-serif text-lg italic mb-1">{artist.artist}</h3>
//                               <p className="text-muted-foreground font-mono text-xs">Artist Profile</p>
//                             </div>
//                             <Button
//                               variant="ghost"
//                               size="icon"
//                               className="h-8 w-8"
//                               onClick={() => removeFromWatchlist(artist.artistId)}
//                             >
//                               <X className="h-4 w-4" />
//                             </Button>
//                           </div>
//                           <Button
//                             variant="outline"
//                             size="sm"
//                             className="w-full font-mono"
//                             onClick={() => {/* Navigate to artist detail page */ }}
//                           >
//                             View Artist Details
//                           </Button>
//                         </CardContent>
//                       </Card>
//                     ))}
//                   </div>
//                 )}
//               </TabsContent>
//             </Tabs>
//           </>
//         )}
//       </div>

//       {/* Sell Modal */}
//       <SellModal
//         open={sellModalOpen}
//         onOpenChange={setSellModalOpen}
//         holding={selectedHoldingData}
//         onConfirm={handleConfirmSell}
//       />
//     </div>
//   );
// }

"use client"

import React, { useEffect, useMemo, useState } from 'react';
import PortfolioHUD from '@/components/PortfolioHUD';
import DriftGrid from '@/components/DriftGrid';
import ListedGrid from '@/components/ListedGrid';
import TunnelView from '@/components/TunnelView';
import ResaleListingModal from '@/components/ResaleListingModal';

import art1 from '@/assets/art-1.jpg';
import art2 from '@/assets/art-2.jpg';
import art3 from '@/assets/art-3.jpg';
import art4 from '@/assets/art-4.jpg';
import art5 from '@/assets/art-5.jpg';
import art6 from '@/assets/art-6.jpg';
import artwork1 from '@/assets/artwork-1.jpg';
import artwork2 from '@/assets/artwork-2.jpg';
import artwork3 from '@/assets/artwork-3.jpg';
import artwork4 from '@/assets/artwork-4.jpg';
import artwork5 from '@/assets/artwork-5.jpg';
import { AnimatePresence, motion } from 'framer-motion';
import MonolithCard from '@/components/MonolithCard';
import { toast } from 'sonner';
import ResaleModal from '@/components/ResaleModal';
import CertificateModal from '@/components/CertificateModal';
import WithdrawalModal from '@/components/WithdrawalModal';
import { getMyCollection, getWatchlist, sellFractal } from '@/apis/my-collection/myCollectionActions';
import { Skeleton } from '@/components/ui/skeleton';


// Mock data
const MOCK_HOLDINGS: any[] = [
  { id: '1', artistName: 'Ravi Varma', artworkUrl: art1, invested: 125000, currentValue: 187500, quantity: 5, gainPercent: 50.0 },
  { id: '2', artistName: 'Anish Kapoor', artworkUrl: art2, invested: 80000, currentValue: 96000, quantity: 3, gainPercent: 20.0 },
  { id: '3', artistName: 'Subodh Gupta', artworkUrl: art3, invested: 200000, currentValue: 230000, quantity: 8, gainPercent: 15.0 },
  { id: '4', artistName: 'Bharti Kher', artworkUrl: art4, invested: 50000, currentValue: 42000, quantity: 2, gainPercent: -16.0 },
  { id: '5', artistName: 'Jitish Kallat', artworkUrl: art5, invested: 150000, currentValue: 195000, quantity: 6, gainPercent: 30.0 },
  { id: '6', artistName: 'Shilpa Gupta', artworkUrl: art6, invested: 90000, currentValue: 103500, quantity: 4, gainPercent: 15.0 },
];

const MOCK_LISTED = [
  { ...MOCK_HOLDINGS[0], listedPrice: 42000, listedDate: '2026-02-05', expiresIn: '3d 14h' },
];

const MOCK_WATCHLIST = [
  { id: 'w1', artistName: 'Tyeb Mehta', artworkUrl: art1, yieldPercent: 12.5, floorPrice: 45000, provenance: 'Christie\'s 2024' },
  { id: 'w2', artistName: 'F.N. Souza', artworkUrl: art3, yieldPercent: 8.2, floorPrice: 32000, provenance: 'Sotheby\'s 2023' },
  { id: 'w3', artistName: 'M.F. Husain', artworkUrl: art5, yieldPercent: 22.1, floorPrice: 78000, provenance: 'Phillips 2025' },
  { id: 'w4', artistName: 'Amrita Sher-Gil', artworkUrl: art4, yieldPercent: 18.7, floorPrice: 120000, provenance: 'DAG 2024' },
  { id: 'w5', artistName: 'S.H. Raza', artworkUrl: art2, yieldPercent: 15.3, floorPrice: 55000, provenance: 'AstaGuru 2025' },
  { id: 'w6', artistName: 'Arpita Singh', artworkUrl: art6, yieldPercent: 9.8, floorPrice: 28000, provenance: 'Pundole\'s 2024' },
];

/** API response types for my-collection */
export interface MyCollectionArtist {
  artist_profile_id: number;
  artist_name: string;
  avatar_url: string;
  total_shares: number;
  /** Shares already sitting in an ACTIVE sell listing — owned, but not re-listable. */
  listed_shares: number;
  /** total_shares - listed_shares; the real cap for a new resale listing. */
  available_shares: number;
  total_invested: string;
  current_value: string;
  artworks: {
    artwork_id: number;
    artwork_name: string;
    shares_count: number;
    available_shares?: number;
  }[];
}

export interface MyCollectionResponse {
  total_amount_invested: string;
  total_portfolio_value: string;
  total_gain_loss: string;
  total_gain_loss_pct: string;
  artists: MyCollectionArtist[];
}

function MyHoldingsSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative max-w-7xl mx-auto w-full h-[180px] overflow-hidden border border-border/50 rounded-sm"
        >
          <Skeleton className="absolute inset-0" />
          <div className="relative z-10 flex flex-col justify-between h-full p-4 md:p-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CollectionPage() {
  const [activeTab, setActiveTab] = useState('My Holdings');
  const [resaleTarget, setResaleTarget] = useState<MyCollectionArtist | null>(null);
  const [certificateTarget, setCertificateTarget] = useState<MyCollectionArtist | null>(null);
  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [myCollection, setMyCollection] = useState<MyCollectionResponse | null>(null);
  const [isLoadingCollection, setIsLoadingCollection] = useState(true);
  const [isLoadingWatchlist, setIsLoadingWatchlist] = useState(true);
  const [watchlist, setWatchlist] = useState<any[]>([]);

  const portfolio = useMemo(() => {
    if (!myCollection) return { totalValue: 0, totalInvested: 0, gainLossAbs: 0, gainLossPerc: 0 };
    // The HUD renders all three figures at zero decimals, so round first and
    // derive the gain/loss from the rounded values. Otherwise value - invested
    // can visibly disagree with the gain/loss card by a rupee.
    const totalValue = Math.round(parseFloat(String(myCollection.total_portfolio_value ?? 0)) || 0);
    const totalInvested = Math.round(parseFloat(String(myCollection.total_amount_invested ?? 0)) || 0);
    const gainLossAbs = totalValue - totalInvested;
    const gainLossPerc = totalInvested > 0 ? (gainLossAbs / totalInvested) * 100 : 0;
    return { totalValue, totalInvested, gainLossAbs, gainLossPerc };
  }, [myCollection]);

  const fetchMyCollection = React.useCallback(async () => {
    setIsLoadingCollection(true);
    try {
      const response = await getMyCollection();
      const data = response?.data?.data;
      if (data && (Array.isArray(data.artists) || data.total_portfolio_value != null)) {
        setMyCollection({
          total_amount_invested: data.total_amount_invested ?? '0',
          total_portfolio_value: data.total_portfolio_value ?? '0',
          total_gain_loss: data.total_gain_loss ?? '0',
          total_gain_loss_pct: data.total_gain_loss_pct ?? '0',
          artists: Array.isArray(data.artists) ? data.artists : [],
        });
      } else {
        setMyCollection(null);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to load collection');
      setMyCollection(null);
    } finally {
      setIsLoadingCollection(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCollection();
  }, [fetchMyCollection]);

  const fetchWatchlist = React.useCallback(async () => {
    setIsLoadingWatchlist(true);
    try {
      const response = await getWatchlist();
      if (response?.status === 200 && response?.data?.data != null) {
        const data = response.data.data;
        setWatchlist(Array.isArray(data) ? data : []);
      } else {
        setWatchlist([]);
      }
    } catch {
      setWatchlist([]);
    } finally {
      setIsLoadingWatchlist(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'Watchlist') {
      fetchWatchlist();
    }
  }, [activeTab, fetchWatchlist]);


  return (
    <div className="min-h-screen relative bg-background text-foreground">
      {/* Fixed Noise Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none noise-overlay" />

      {/* Background Gradient */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-void opacity-80" />

      <div className="relative z-10">
        <PortfolioHUD
          metrics={{ totalValue: portfolio.totalValue, invested: portfolio.totalInvested, gainLoss: portfolio.gainLossAbs, gainLossPercent: portfolio.gainLossPerc }}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onWithdrawClick={() => setWithdrawalOpen(true)}
        />

        <main className="py-8 container mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            {activeTab === 'My Holdings' && (
              <motion.div
                key="holdings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-6"
              >
                {isLoadingCollection ? (
                  <MyHoldingsSkeleton />
                ) : !myCollection?.artists?.length ? (
                  <div className="text-center py-12 text-muted-foreground font-mono text-sm">
                    No holdings yet. Start collecting fractals from the marketplace.
                  </div>
                ) : (
                  myCollection.artists.map((artist, index) => (
                    <motion.div
                      key={artist.artist_profile_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <MonolithCard
                        artistId={artist.artist_profile_id}
                        artistName={artist.artist_name}
                        artworkUrl={artist.avatar_url}
                        totalFractals={artist.total_shares}
                        listedFractals={artist.listed_shares ?? 0}
                        investedAmount={parseFloat(artist.total_invested) || 0}
                        currentValue={parseFloat(artist.current_value) || 0}
                        onSell={() => setResaleTarget(artist)}
                        onCertificate={() => setCertificateTarget(artist)}
                      />
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
            {activeTab === 'Listed for Sale' && (
              <motion.div
                key="listed"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <ListedGrid />
              </motion.div>
            )}
            {activeTab === 'Watchlist' && (
              <motion.div
                key="watchlist"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <TunnelView items={watchlist} loading={isLoadingWatchlist} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <CertificateModal
          isOpen={!!certificateTarget}
          onClose={() => setCertificateTarget(null)}
          artistProfileId={certificateTarget?.artist_profile_id ?? 0}
          artistName={certificateTarget?.artist_name ?? ''}
        />

        <ResaleModal
          isOpen={!!resaleTarget}
          onClose={() => setResaleTarget(null)}
          artistName={resaleTarget?.artist_name ?? ''}
          artistProfileId={resaleTarget?.artist_profile_id ?? 0}
          maxQuantity={resaleTarget?.available_shares ?? resaleTarget?.total_shares ?? 0}
          artworks={(resaleTarget?.artworks ?? []).map((a) => ({
            artwork_id: a.artwork_id,
            artwork_name: a.artwork_name,
            available_shares: a.available_shares ?? a.shares_count,
          }))}
          onSubmit={async (data) => {
            if (!resaleTarget) return false;
            try {
              await sellFractal({
                artist_profile_id: resaleTarget.artist_profile_id,
                ...(data.artworkId ? { artwork_id: data.artworkId } : {}),
                quantity: data.quantity,
                listed_price: data.price,
              });
              toast.success(`Listed ${data.quantity} fractals at ₹${data.price.toLocaleString()} each`);
              setResaleTarget(null);
              await fetchMyCollection();
              return true;
            } catch (err: any) {
              toast.error(err?.response?.data?.message ?? 'Failed to list fractals');
              return false;
            }
          }}
        />

        <WithdrawalModal
          isOpen={withdrawalOpen}
          onClose={() => setWithdrawalOpen(false)}
          onSuccess={() => fetchMyCollection()}
          source="collector"
        />
      </div>
    </div>
  );
};

