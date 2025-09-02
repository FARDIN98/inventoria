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
      <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-blue-950/30 border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm rounded-xl">
        <div className="p-12 text-center">
          <div className="text-6xl mb-6">📦</div>
          <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-100 bg-clip-text text-transparent">
            {t('common.noInventoriesFound')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {t('dashboard.noInventoriesDescription', 'No inventories available at the moment.')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-blue-950/30 border border-slate-200/60 dark:border-slate-700/60 shadow-lg backdrop-blur-sm rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/30 dark:to-purple-950/30 border-b border-slate-200/50 dark:border-slate-700/50">
            <TableHead className="w-[300px] font-bold text-slate-700 dark:text-slate-200">{t('forms.title', 'Title')}</TableHead>
            <TableHead className="font-bold text-slate-700 dark:text-slate-200">{t('forms.description', 'Description')}</TableHead>
            <TableHead className="w-[200px] font-bold text-slate-700 dark:text-slate-200">{t('common.creator', 'Creator')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((inventory) => (
            <TableRow 
              key={inventory.id} 
              className="transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-950/30 dark:hover:to-purple-950/30 hover:scale-[1.01] hover:shadow-lg"
            >
              <TableCell className="font-medium">
                <Link 
                  href={`/inventory/${inventory.id}`}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 dark:hover:from-blue-300 dark:hover:to-purple-300 transition-all duration-200 hover:scale-105 inline-block font-semibold underline"
                >
                  {inventory.title}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {inventory.description || t('common.noDescription')}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/60 dark:to-teal-900/60 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 shadow-sm border border-emerald-200/50 dark:border-emerald-700/50 hover:scale-105 transition-transform duration-200">
                  {inventory.users?.name || inventory.users?.email || t('common.unknown')}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}