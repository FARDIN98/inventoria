import AuthForm from "@/components/AuthForm"

export default function RegisterPage() {
  return (
    <AuthForm
      title="Create your account"
      description="Enter your details to create a new account"
      submitText="Register"
      linkLabel="Already have an account?"
      linkText="Sign in"
      linkHref="/login"
      showSocialLogin={false}
    />
  )
}