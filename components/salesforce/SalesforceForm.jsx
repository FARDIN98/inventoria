'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SalesforceForm = () => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      jobTitle: '',
      department: '',
      companyName: '',
      industry: '',
      website: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      notes: ''
    }
  });

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/salesforce/auth', {
        method: 'POST'
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.isConnected);
        setConnectionStatus('checked');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setConnectionStatus('error');
    }
  };

  // Check Salesforce connection status on component mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const handleSalesforceConnect = () => {
    // Redirect to Salesforce OAuth
    window.location.href = '/api/salesforce/auth';
  };

  const handleSalesforceDisconnect = async () => {
    try {
      const response = await fetch('/api/salesforce/disconnect', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok) {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setSubmitResult({
          type: 'success',
          message: 'Successfully disconnected from Salesforce!'
        });
      } else {
        setSubmitResult({
          type: 'error',
          message: result.error || 'Failed to disconnect from Salesforce'
        });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      setSubmitResult({
        type: 'error',
        message: 'Network error. Please try again.'
      });
    }
  };

  const onSubmit = async (data) => {
    if (!isConnected) {
      setSubmitResult({
        type: 'error',
        message: 'Please connect to Salesforce first'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/salesforce/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setSubmitResult({
          type: 'success',
          message: 'Successfully exported to Salesforce!',
          data: result.data
        });
        reset(); // Clear form on success
      } else {
        setSubmitResult({
          type: 'error',
          message: result.error || 'Failed to export to Salesforce'
        });
      }
    } catch (error) {
      console.error('Export error:', error);
      setSubmitResult({
        type: 'error',
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'Manufacturing',
    'Retail',
    'Real Estate',
    'Consulting',
    'Media',
    'Other'
  ];

  if (connectionStatus === 'checking') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full max-w-md mx-auto">
            Fill Your Data
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Checking Salesforce connection...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full max-w-md mx-auto">
          Fill Your Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Salesforce Integration
          </DialogTitle>
          <DialogDescription>
            Export user data to your Salesforce CRM system
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
        {/* Connection Status */}
        {!isConnected && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Connect to Salesforce to export data</span>
              <Button onClick={handleSalesforceConnect} size="sm">
                Connect Salesforce
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isConnected && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="flex items-center justify-between text-green-800">
              <span>Successfully connected to Salesforce</span>
              <Button 
                onClick={handleSalesforceDisconnect} 
                variant="outline" 
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Disconnect
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Result */}
        {submitResult && (
          <Alert className={submitResult.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {submitResult.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={submitResult.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {submitResult.message}
              {submitResult.data && (
                <div className="mt-2 text-sm">
                  <p>Account: {submitResult.data.account.name}</p>
                  <p>Contact: {submitResult.data.contact.name}</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                {...register('firstName', { required: 'First name is required' })}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                {...register('lastName', { required: 'Last name is required' })}
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                {...register('phone')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                {...register('jobTitle')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              {...register('department')}
            />
          </div>

          {/* Company Information */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Company Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                {...register('companyName')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select onValueChange={(value) => setValue('industry', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://"
                  {...register('website')}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-medium">Address Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="address">Street Address</Label>
              <Input
                id="address"
                {...register('address')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...register('city')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  {...register('state')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  {...register('postalCode')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register('country')}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Any additional information..."
              {...register('notes')}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isConnected || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting to Salesforce...
              </>
            ) : (
              'Export to Salesforce'
            )}
          </Button>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SalesforceForm;