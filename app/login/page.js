"use client"

import AuthForm from "@/components/AuthForm"
import { useTranslation } from 'react-i18next'

export default function LoginPage() {
  const { t } = useTranslation()
  
  return (
    <AuthForm
      title={t('auth.signInTitle')}
      description={t('auth.signInDescription')}
      submitText={t('auth.signIn')}
      linkLabel={t('auth.noAccountLabel')}
      linkText={t('auth.register')}
      linkHref="/register"
      showSocialLogin={true}
      isLogin={true}
    />
  )
}