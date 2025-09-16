"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { SupportTicketDialog } from "@/components/SupportTicketDialog"
import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"

/**
 * Footer component with support ticket link
 * Provides easy access to support from any page
 */
export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Left side - Brand */}
          <div className="flex items-center space-x-2">
            <Link href="/" className="font-semibold text-lg text-foreground hover:text-primary transition-colors">
              Inventoria
            </Link>
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()}
            </span>
          </div>
          
          {/* Center - Support Link */}
          <div className="flex items-center">
            <SupportTicketDialog 
              trigger={
                <Button variant="link" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4" />
                  {t('footer.createSupportTicket', 'Create support ticket')}
                </Button>
              }
            />
          </div>
          
          {/* Right side - Additional links */}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>
              {t('footer.needHelp', 'Need help? Create a support ticket')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}