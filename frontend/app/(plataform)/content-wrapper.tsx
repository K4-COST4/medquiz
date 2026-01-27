"use client"

import { usePathname } from "next/navigation"
import { FooterWrapper } from "./footer-wrapper"

export function ContentWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    // MedAI: No bottom padding (full height usage)
    // Others: Standard padding
    const isMedAI = pathname?.includes('/medai')

    // MedAI page manages its own layout, so we give it full height.
    // Other pages need padding-bottom so content isn't hidden by nav/footers.
    const containerClass = isMedAI
        ? "min-h-screen flex flex-col" // No padding
        : "pb-32 md:pb-8 min-h-screen flex flex-col"

    return (
        <div className={containerClass}>
            <div className="flex-1">
                {children}
            </div>
            <FooterWrapper />
        </div>
    )
}
