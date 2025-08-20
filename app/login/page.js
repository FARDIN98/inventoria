import AuthForm from "@/components/AuthForm"

export default function LoginPage() {
  return (
    <AuthForm
      title="Sign in to your account"
      description="Enter your email and password to access your account"
      submitText="Sign In"
      linkLabel="Don't have an account?"
      linkText="Register"
      linkHref="/register"
      showSocialLogin={true}
      isLogin={true}
    />
  )
}