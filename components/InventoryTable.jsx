"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function InventoryTable({ data, title }) {
  const { t } = useTranslation()
  
  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-muted-foreground">{t('common.noInventoriesFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">{t('forms.title')}</TableHead>
        <TableHead>{t('forms.description')}</TableHead>
        <TableHead className="w-[200px]">{t('common.creator')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((inventory) => (
            <TableRow key={inventory.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                <Link 
                  href={`/inventory/${inventory.id}`}
                  className="text-primary hover:underline transition-colors"
                >
                  {inventory.title}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {inventory.description}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium text-foreground">
                  {inventory.users?.name || inventory.users?.email || t('common.unknown')}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}