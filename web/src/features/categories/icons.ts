import {
  Baby, Banknote, Beer, Bike, BookOpen, Briefcase, Building, Bus, Car, Coffee, Coins, CreditCard, Droplets,
  Dumbbell, Ellipsis, Film, Fuel, Gamepad2, Gift, GraduationCap, HandCoins, HeartPulse, House, Landmark, Laptop,
  Music, PartyPopper, PawPrint, PiggyBank, Pill, Pizza, Plane, Receipt, Scissors, Shield, Shirt, ShoppingBag,
  ShoppingCart, Smartphone, Sparkles, Stethoscope, TrainFront, TrendingUp, Tv, Utensils, Wallet, Wifi, Wrench, Zap,
  CircleHelp, type LucideIcon,
} from 'lucide-react'

/**
 * Icons a category can use. The API stores the lucide name as text; only these
 * are offered (and bundled) — importing all of lucide would add hundreds of KB.
 * Order is the order shown in the picker.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Utensils, Coffee, Pizza, Beer, ShoppingCart, ShoppingBag, Shirt, Gift,
  Car, Bus, TrainFront, Bike, Fuel, Plane,
  House, Building, Zap, Droplets, Wifi, Smartphone, Laptop, Wrench,
  Tv, Film, Music, Gamepad2, PartyPopper, Dumbbell,
  HeartPulse, Pill, Stethoscope, Shield, GraduationCap, BookOpen, Baby, PawPrint, Scissors,
  Briefcase, Banknote, Wallet, PiggyBank, Coins, HandCoins, TrendingUp, Landmark, Receipt, CreditCard, Sparkles,
  Ellipsis,
}

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS)

/** Shown for unknown names (e.g. saved by a newer app version). */
export const FALLBACK_ICON: LucideIcon = CircleHelp
