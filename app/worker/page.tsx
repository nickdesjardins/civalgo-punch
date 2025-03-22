'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { checkInWorker, checkOutWorker, getWorkers, getSites, getWorkerState, getSiteEmergencyStatus, Worker, Site, supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from 'next/image';

interface FormValues {
  name: string;
  workerId: string;
  siteId: string;
}

export default function WorkerPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState<boolean | null>(null);
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({
    type: null,
    message: '',
  });
  const [emergencyActive, setEmergencyActive] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      workerId: '',
      siteId: '',
    },
  });

  const workerId = form.watch('workerId');
  const siteId = form.watch('siteId');
  const hasSelectedWorker = !!workerId;

  // Helper function to broadcast worker status events
  const broadcastWorkerEvent = useCallback(async (
    eventType: 'worker-checked-in' | 'worker-checked-out', 
    payload: { 
      workerId: string;
      siteId: string;
      name: string; 
      timestamp: string;
    }
  ) => {
    const channel = supabase.channel('worker-check-events');
    await channel.send({
      type: 'broadcast',
      event: eventType,
      payload
    });
  }, []);

  // Check for emergency status
  const checkEmergencyStatus = useCallback(async (siteId: string) => {
    if (!siteId) {
      setEmergencyActive(false);
      return;
    }
    
    try {
      const isEmergency = await getSiteEmergencyStatus(siteId);
      setEmergencyActive(isEmergency);
    } catch {
      setEmergencyActive(false);
    }
  }, []);

  // Fetch workers and sites on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        const [workersData, sitesData] = await Promise.all([
          getWorkers(),
          getSites()
        ]);
        
        setWorkers(workersData as Worker[]);
        setSites(sitesData as Site[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    }
    
    fetchData();
    
    // Set up a broadcast channel for local tab communication
    const channel = supabase.channel('worker-check-events', {
      config: {
        broadcast: { self: true },
      }
    });
    
    // Set up real-time subscription for site updates
    const sitesChannel = supabase
      .channel('sites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sites'
        },
        async (payload) => {
          // Extract the updated site data
          const updatedSite = payload.new as Site;
          
          if (!updatedSite || !updatedSite.id) {
            console.log('Site update received but data is invalid');
            return;
          }
          
          // Get the active site ID (either from the form or the worker's current site)
          const activeSiteId = siteId || currentSiteId;
          
          // Update our local sites array with the new emergency status
          setSites(prevSites => 
            prevSites.map(site => 
              site.id === updatedSite.id 
                ? { ...site, emergency: updatedSite.emergency } 
                : site
            )
          );
          
          // If no site is selected, don't show emergency
          if (!activeSiteId) {
            setEmergencyActive(false);
            return;
          }
          
          // If this is the site we're concerned with, update emergency status directly
          if (activeSiteId === updatedSite.id) {
            setEmergencyActive(!!updatedSite.emergency);
          } 
          // If any site goes into emergency, we should check our current site
          else if (updatedSite.emergency) {
            if (activeSiteId) {
              await checkEmergencyStatus(activeSiteId);
            }
          }
        }
      )
      .subscribe();
    
    channel.subscribe();
    
    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(sitesChannel);
    };
  }, [siteId, currentSiteId, checkEmergencyStatus]);

  // Check if the worker is currently checked in and at which site
  const checkWorkerStatus = useCallback(async (workerId: string) => {
    try {
      setIsCheckedIn(null);
      setCurrentSiteId(null);
      setIsCheckingStatus(true);
      
      const workerState = await getWorkerState(workerId);
      
      if (workerState) {
        setIsCheckedIn(workerState.is_checked_in);
        
        if (workerState.site_id) {
          setCurrentSiteId(workerState.site_id);
          form.setValue('siteId', workerState.site_id);
          
          // Check emergency status for this site
          await checkEmergencyStatus(workerState.site_id);
        }
      } else {
        setIsCheckedIn(false);
      }
    } catch (error) {
      console.error('Error checking worker status:', error);
      setIsCheckedIn(null);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [form, checkEmergencyStatus]);

  // Check worker status when workerId changes
  useEffect(() => {
    setStatus({ type: null, message: '' });
    
    if (workerId) {
      checkWorkerStatus(workerId);
    } else {
      setIsCheckedIn(null);
      setCurrentSiteId(null);
      form.setValue('siteId', '');
    }
  }, [workerId, form, checkWorkerStatus]);

  // Check emergency status when site changes
  useEffect(() => {
    if (siteId) {
      checkEmergencyStatus(siteId);
    }
  }, [siteId, checkEmergencyStatus]);

  // Update name field when worker is selected
  const updateWorkerName = (workerId: string) => {
    const selectedWorker = workers.find(worker => worker.id === workerId);
    if (selectedWorker) {
      form.setValue('name', selectedWorker.name);
    }
  };

  // Handle check-in/check-out actions
  async function handlePunchAction() {
    // Don't proceed if button should be disabled
    if (buttonDisabled) return;
    
    const values = form.getValues();
    
    // Prevent check-in during emergency
    if (!isCheckedIn && emergencyActive) {
      setStatus({
        type: 'error',
        message: 'Cannot check in during an emergency. Site access is restricted.',
      });
      return;
    }
    
    setIsSubmitting(true);
    setStatus({ type: null, message: '' });
    
    try {
      const isCheckingIn = !isCheckedIn;
      const actionFn = isCheckingIn ? checkInWorker : checkOutWorker;
      const eventType = isCheckingIn ? 'worker-checked-in' : 'worker-checked-out';
      const successMessage = isCheckingIn 
        ? `Check-in successful. Welcome, ${values.name}!`
        : `Check-out successful. Goodbye, ${values.name}!`;
      
      await actionFn({
        workerId: values.workerId,
        siteId: values.siteId,
      });
      
      await broadcastWorkerEvent(eventType, { 
        workerId: values.workerId,
        siteId: values.siteId,
        name: values.name,
        timestamp: new Date().toISOString()
      });
      
      setStatus({
        type: 'success',
        message: successMessage,
      });
      
      setIsCheckedIn(isCheckingIn);
      if (isCheckingIn) {
        setCurrentSiteId(values.siteId);
      }
    } catch (error) {
      console.error(`Action error:`, error);
      setStatus({
        type: 'error',
        message: `Failed to ${isCheckedIn ? 'check out' : 'check in'}. Please try again.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  // Determine button state
  const buttonDisabled = isSubmitting || !hasSelectedWorker || isCheckingStatus || (emergencyActive && !isCheckedIn);
  
  // Find current site name for displaying
  const currentSiteName = currentSiteId
    ? sites.find(site => site.id === currentSiteId)?.name || 'Unknown Site'
    : null;

  const selectedSiteName = siteId
    ? sites.find(site => site.id === siteId)?.name || 'Unknown Site'
    : null;

  return (
    <div className="container mx-auto py-12 px-4 max-w-md">
      <h1 className="text-3xl font-bold text-center mb-8">Worker Check-In/Out</h1>

      {emergencyActive && siteId && (
        <Alert variant="destructive" className="mb-6 animate-pulse border-2 border-red-600">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-red-600 font-bold text-lg">EMERGENCY EVACUATION</AlertTitle>
          <AlertDescription>
            {isCheckedIn 
              ? "Please evacuate the site immediately and punch out once safely outside." 
              : "Site evacuation in progress. Please do not enter and stay clear of the area."}
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Enter Your Details</CardTitle>
          <CardDescription>Check in when you arrive or check out when you leave</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-6">
              <FormField
                control={form.control}
                name="workerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Worker</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        updateWorkerName(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Worker" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full overflow-y-auto">
                        {workers.map((worker) => (
                          <SelectItem className="w-full" key={worker.id} value={worker.id}>
                            {worker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="siteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Site
                      {isCheckedIn && currentSiteName && (
                        <span className="ml-2 text-sm text-stone-500">
                          (Currently at: {currentSiteName})
                        </span>
                      )}
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={isCheckedIn === true} // Disable site selection when checked in
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Construction Site" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sites.map((site) => (
                          <SelectItem key={site.id} value={site.id}>
                            {site.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isCheckedIn && (
                      <p className="text-xs text-stone-500 mt-1">
                        When checked in, you can only check out from your current site.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {hasSelectedWorker && isCheckedIn !== null && (
                <div className="flex items-center justify-center mt-4">
                  <Badge variant={isCheckedIn ? "default" : "outline"} className={isCheckedIn ? "bg-green-500" : ""}>
                    {isCheckedIn ? "Currently Checked In" : "Currently Checked Out"}
                  </Badge>
                </div>
              )}

              {emergencyActive && isCheckedIn && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 font-medium text-center">
                    EMERGENCY AT {selectedSiteName?.toUpperCase()}
                  </p>
                  <p className="text-sm text-center mt-1">
                    Please evacuate immediately and punch out once safely outside.
                  </p>
                </div>
              )}
            </form>
          </Form>

          {status.type && (
            <div className={`mt-6 p-4 rounded-md ${
              status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {status.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={buttonDisabled ? undefined : handlePunchAction}
            aria-disabled={buttonDisabled}
            className={`w-32 h-32 rounded-full flex items-center justify-center p-0 shadow-lg hover:shadow-xl transition-all border-2 ${
              (emergencyActive && !isCheckedIn) || isSubmitting || !hasSelectedWorker || isCheckingStatus
                ? 'bg-gray-300 hover:bg-gray-300 border-gray-400 cursor-not-allowed opacity-60'
                : 'bg-gray-700 hover:bg-gray-800 border-gray-600 hover:border-gray-500 ring-4 ring-gray-800 ring-opacity-50 cursor-pointer'
            }`}
          >
            <div className="relative flex flex-col items-center justify-center">
              <Image 
                src="/images/punch.webp" 
                alt="Punch" 
                width={64}
                height={64}
                className="object-contain"
                onError={() => {
                  // Fallback handled by next/image automatically
                }}
              />
              <span className={`font-bold mt-2 text-sm ${
                isCheckedIn ? 'text-red-500' : 'text-green-400'
              }`}>
                {isCheckedIn ? "Punch Out" : "Punch In"}
              </span>
            </div>
          </Button>
        </CardFooter>
      </Card>

      {emergencyActive && !isCheckedIn && siteId && (
        <div className="mt-6 p-4 bg-red-50 border-2 border-red-600 rounded-md text-center">
          <p className="text-red-600 font-bold mb-2">
            WARNING: EMERGENCY IN PROGRESS
          </p>
          <p className="text-sm">
            Site entry not permitted during an emergency evacuation. 
            Please remain at a safe distance from the site.
          </p>
        </div>
      )}
    </div>
  );
} 