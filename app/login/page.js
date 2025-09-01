"use client"

import AuthForm from "@/components/AuthForm"
import { useTranslation } from 'react-i18next'

export default function LoginPage() {
  const { t } = useTranslation()
  
  return (
    <AuthForm
      title={t('auth.signInTitle', 'Sign In')}
      description={t('auth.signInDescription', 'Sign In with your credentials')}
      submitText={t('auth.signIn', 'Sign In')}
      linkLabel={t('auth.noAccountLabel', 'No Account?')}
      linkText={t('auth.register', 'Register')}
      linkHref="/register"
      showSocialLogin={true}
      isLogin={true}
    />
  )
}