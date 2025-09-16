"use client"

import { useState } from "react"
import { HelpCircle, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { createSupportTicket } from "@/lib/support-actions"

/**
 * Support Ticket Dialog Component
 * Allows users to create support tickets from any page
 * Generates JSON files and uploads them to Dropbox for Power Automate integration
 */
export function SupportTicketDialog({ trigger, inventoryTitle = null }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    summary: "",
    priority: ""
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.summary.trim()) {
      toast.error(t('support.errors.summaryRequired', 'Please provide a summary'))
      return
    }
    
    if (!formData.priority) {
      toast.error(t('support.errors.priorityRequired', 'Please select a priority'))
      return
    }

    setIsSubmitting(true)
    
    try {
      const ticketData = {
        summary: formData.summary.trim(),
        priority: formData.priority,
        inventoryTitle,
        currentUrl: window.location.href
      }
      
      const result = await createSupportTicket(ticketData)
      
      if (result.success) {
        toast.success(t('support.success', 'Support ticket created successfully'))
        setFormData({ summary: "", priority: "" })
        setOpen(false)
      } else {
        toast.error(result.error || t('support.errors.generic', 'Failed to create support ticket'))
      }
    } catch (error) {
      console.error('Error creating support ticket:', error)
      toast.error(t('support.errors.generic', 'Failed to create support ticket'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            {t('support.createTicket', 'Create Support Ticket')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {t('support.title', 'Create Support Ticket')}
          </DialogTitle>
          <DialogDescription>
            {t('support.description', 'Describe your issue and we\'ll help you resolve it.')}
            {inventoryTitle && (
              <span className="block mt-1 text-sm font-medium">
                {t('support.inventory', 'Inventory')}: {inventoryTitle}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="summary">
              {t('support.summary', 'Summary')} *
            </Label>
            <Textarea
              id="summary"
              placeholder={t('support.summaryPlaceholder', 'Briefly describe your issue...')}
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              className="min-h-[80px]"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="priority">
              {t('support.priority', 'Priority')} *
            </Label>
            <Select
              value={formData.priority}
              onValueChange={(value) => handleInputChange('priority', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('support.selectPriority', 'Select priority level')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">
                  {t('support.priorities.high', 'High')}
                </SelectItem>
                <SelectItem value="Average">
                  {t('support.priorities.average', 'Average')}
                </SelectItem>
                <SelectItem value="Low">
                  {t('support.priorities.low', 'Low')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('support.submitting', 'Creating...')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('support.submit', 'Create Ticket')}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}