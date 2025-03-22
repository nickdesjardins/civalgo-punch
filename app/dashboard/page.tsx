'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { getWorkersWithStatus, supabase, updateSiteEmergencyStatus, getSites as fetchSites } from '@/lib/supabase';
import { Loader2, RefreshCw, Users, Clock, Calendar, Percent, AlertTriangle, AlertOctagon } from "lucide-react";
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface WorkerWithStatus {
  id: string;
  worker_id: string;
  site_id: string | null;
  is_checked_in: boolean;
  last_check_in: string | null;
  last_check_out: string | null;
  updated_at: string;
  workers: {
    id: string;
    name: string;
  };
  sites?: {
    id: string;
    name: string;
  } | null;
}

interface Site {
  id: string;
  name: string;
  emergency?: boolean;
}

export default function DashboardPage() {
  const [workers, setWorkers] = useState<WorkerWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('all');
  const [isActivatingEmergency, setIsActivatingEmergency] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  
  // Add refs to store latest values
  const selectedSiteIdRef = useRef<string>(selectedSiteId);
  const fetchWorkersRef = useRef<((showRefreshing?: boolean) => Promise<void>) | null>(null);

  // Update the refs when values change
  useEffect(() => {
    selectedSiteIdRef.current = selectedSiteId;
  }, [selectedSiteId]);

  // Helper function to update all worker-related state
  const updateWorkerState = useCallback((data: WorkerWithStatus[]) => {
    if (data.length === 0) {
      setWorkers([]);
      setCheckedInCount(0);
      setLastUpdated(new Date());
      return;
    }
    
    const oldWorkers = [...workers];
    setWorkers(data);
    
    const checkedIn = data.filter(w => w.is_checked_in && w.site_id === selectedSiteId);
    setCheckedInCount(checkedIn.length);
    setLastUpdated(new Date());
    
    const changedWorkerIds = new Set<string>();
    
    if (oldWorkers.length > 0) {
      data.forEach(newWorker => {
        const oldWorker = oldWorkers.find(w => w.worker_id === newWorker.worker_id);
        if (oldWorker && oldWorker.is_checked_in !== newWorker.is_checked_in) {
          changedWorkerIds.add(newWorker.worker_id);
        }
      });
    }
    
    if (changedWorkerIds.size > 0) {
      setRecentlyUpdated(changedWorkerIds);
      setTimeout(() => setRecentlyUpdated(new Set()), 5000);
    }
  }, [workers, selectedSiteId]);

  // Function to fetch worker data
  const fetchWorkers = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      }
      
      // Perform data fetching in parallel
      const [workerData, sitesData] = await Promise.all([
        getWorkersWithStatus(),
        fetchSites()
      ]);
      
      // Update worker state
      const data = workerData as unknown as WorkerWithStatus[];
      updateWorkerState(data);
      
      // Update sites
      setSites(sitesData as Site[]);
      
      // Update emergency status based on site selection
      if (selectedSiteIdRef.current !== 'all') {
        const selectedSite = sitesData.find(site => site.id === selectedSiteIdRef.current);
        setEmergencyActive(!!selectedSite?.emergency);
      } else {
        const hasEmergency = sitesData.some(site => site.emergency);
        setEmergencyActive(hasEmergency);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching workers:', err);
      setError('Failed to load workers. Please try again later.');
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [updateWorkerState]);
  
  // Store the latest fetchWorkers function in a ref
  useEffect(() => {
    fetchWorkersRef.current = fetchWorkers;
  }, [fetchWorkers]);

  // Function to handle emergency activation
  const handleEmergencyToggle = useCallback(async () => {
    if (isActivatingEmergency) return; // Prevent double clicks
    
    // Calculate new emergency state
    const newEmergencyState = !emergencyActive;
    
    // Set loading state
    setIsActivatingEmergency(true);
    
    try {
      // Update UI immediately for better user feedback
      setEmergencyActive(newEmergencyState);
      
      if (selectedSiteId === 'all') {
        // Set emergency for all sites
        await Promise.allSettled(
          sites.map(site => updateSiteEmergencyStatus(site.id, newEmergencyState))
        );
        
        // Update our local sites data
        setSites(prevSites => 
          prevSites.map(site => ({
            ...site,
            emergency: newEmergencyState
          }))
        );
      } else {
        // Set emergency for selected site only
        await updateSiteEmergencyStatus(selectedSiteId, newEmergencyState);
        
        // Update our local sites data
        setSites(prevSites => 
          prevSites.map(site => 
            site.id === selectedSiteId 
              ? { ...site, emergency: newEmergencyState } 
              : site
          )
        );
      }
      
      // Force a direct database check for the update
      if (selectedSiteId !== 'all') {
        const { data, error } = await supabase
          .from('sites')
          .select('id, name, emergency')
          .eq('id', selectedSiteId)
          .single();
          
        if (data && !error) {
          // Make sure our local sites array is updated with the newest data
          setSites(prevSites => 
            prevSites.map(site => 
              site.id === selectedSiteId 
                ? { ...site, emergency: data.emergency } 
                : site
            )
          );
          // Set UI state based on direct DB check
          setEmergencyActive(!!data.emergency);
        }
      } else {
        // For "all sites", perform a full refresh to get the latest status
        const { data, error } = await supabase
          .from('sites')
          .select('id, name, emergency');
          
        if (data && !error) {
          setSites(data);
          const hasEmergency = data.some(site => site.emergency);
          setEmergencyActive(hasEmergency);
        }
      }
    } catch {
      // Revert UI state on error
      setEmergencyActive(emergencyActive); 
    } finally {
      // Reset loading state after a short delay
      setTimeout(() => {
        setIsActivatingEmergency(false);
      }, 1000);
    }
  }, [selectedSiteId, sites, emergencyActive, isActivatingEmergency]);

  // Set up real-time subscription and initial fetch
  useEffect(() => {
    // Initial data fetch
    fetchWorkersRef.current?.();
    
    // Set up subscription only once
    const channel = supabase
      .channel('worker-states-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'worker_states'
        },
        () => {
          console.log('Worker states changed, refreshing data');
          fetchWorkersRef.current?.();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sites'
        },
        (payload) => {
          console.log('Sites changed:', payload);
          
          // Extract the site that changed and its emergency status
          const updatedSite = payload.new as Site;
          
          if (!updatedSite || updatedSite.id === undefined) {
            console.log('Sites changed but data is invalid, refreshing full data');
            fetchWorkersRef.current?.();
            return;
          }
          
          // Update our local sites array with the new data
          setSites(prevSites => {
            const newSites = prevSites.map(site => 
              site.id === updatedSite.id 
                ? { ...site, emergency: updatedSite.emergency } 
                : site
            );
            return newSites;
          });
          
          // Get current selected site ID from the ref
          const currentSelectedSiteId = selectedSiteIdRef.current;
          
          // Update emergency status based on site change
          if (currentSelectedSiteId === updatedSite.id) {
            setEmergencyActive(!!updatedSite.emergency);
          } 
          else if (currentSelectedSiteId === 'all') {
            // For "all sites" view, check if any site has emergency
            supabase
              .from('sites')
              .select('id, name, emergency')
              .then(({ data, error }) => {
                if (!error && data) {
                  const hasEmergency = data.some(site => site.emergency);
                  setEmergencyActive(hasEmergency);
                  setSites(data);
                }
              });
          }
          
          // Refresh worker data to ensure everything is in sync
          fetchWorkersRef.current?.(false);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to real-time updates');
        }
      });
    
    subscriptionRef.current = channel;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchWorkersRef.current?.();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (subscriptionRef.current) {
        console.log('Unsubscribing from realtime updates');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, []);

 useEffect(() => {
    if (workers.length > 0) {
      const checkedIn = workers.filter(w => w.is_checked_in && 
        (selectedSiteId === 'all' || w.site_id === selectedSiteId));
      setCheckedInCount(checkedIn.length);
    }
  }, [selectedSiteId, workers]);

  // This replaces both the emergency status check and the separate fetchWorkers call
  useEffect(() => {
    // When selected site changes, update data without recreating subscription
    if (!isLoading && sites.length > 0) {
      // Just update the checked-in count without re-fetching
      const checkedIn = workers.filter(w => w.is_checked_in && 
        (selectedSiteId === 'all' || w.site_id === selectedSiteId));
      setCheckedInCount(checkedIn.length);
      
      // Update emergency status without logging
      if (!isActivatingEmergency) {
        if (selectedSiteId === 'all') {
          const hasEmergency = sites.some(site => site.emergency);
          setEmergencyActive(hasEmergency);
        } else {
          const selectedSite = sites.find(site => site.id === selectedSiteId);
          setEmergencyActive(!!selectedSite?.emergency);
        }
      }
    }
  }, [selectedSiteId, sites, workers, isLoading, isActivatingEmergency]);

  const getRowHighlightClass = (workerId: string) => 
    recentlyUpdated.has(workerId) ? 'bg-green-50 transition-colors duration-500 dark:bg-green-950/20' : '';

  // Filter workers based on selected site
  const filteredWorkers = selectedSiteId === 'all' 
    ? workers 
    : workers.filter(worker => worker.site_id === selectedSiteId);

  // Calculate metrics for new cards
  const attendanceRate = workers.length ? Math.round((checkedInCount / workers.length) * 100) : 0;
  
  // Find the most recent check-in/out time
  const recentActivity = workers.reduce((latest, worker) => {
    const checkIn = worker.last_check_in ? new Date(worker.last_check_in) : null;
    const checkOut = worker.last_check_out ? new Date(worker.last_check_out) : null;
    
    if (!latest) return checkIn || checkOut || null;
    
    if (checkIn && checkIn > latest) return checkIn;
    if (checkOut && checkOut > latest) return checkOut;
    
    return latest;
  }, null as Date | null);

  // Get today's checked in count
  const todayCheckins = workers.filter(worker => {
    if (!worker.last_check_in) return false;
    const checkInDate = new Date(worker.last_check_in);
    const today = new Date();
    return checkInDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
          <p className="text-stone-600 mt-1">Real-time view of workers currently on site</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center">
            <div className="bg-green-100 rounded-full p-1.5 mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-700">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
            </div>
            <div className="mr-3">
              <p className="font-medium text-green-800 text-sm">Real-time updates enabled</p>
              <p className="text-xs text-green-700">Last updated: {format(lastUpdated, 'h:mm:ss a')}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchWorkers(true)} 
              disabled={isRefreshing || isLoading}
              className="h-8 ml-1"
            >
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5 text-xs">Refresh</span>
            </Button>
          </div>
          
          <div className="w-52">
            <Select 
              value={selectedSiteId} 
              onValueChange={setSelectedSiteId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Construction Site" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Construction Sites</SelectItem>
                {sites.map(site => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* First row of cards */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">Workers On Site</CardTitle>
                <CardDescription className="text-xs">Total checked-in workers</CardDescription>
              </div>
              <div className="flex items-center">
                <Users className="h-7 w-7 text-blue-600 mr-2" />
                <span className="text-3xl font-bold">{checkedInCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">Total Workers</CardTitle>
                <CardDescription className="text-xs">All registered workers</CardDescription>
              </div>
              <div className="flex items-center">
                <Users className="h-7 w-7 text-indigo-600 mr-2" />
                <span className="text-3xl font-bold">{workers.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">Last Activity</CardTitle>
                <CardDescription className="text-xs">Most recent check-in/out</CardDescription>
              </div>
              <div className="flex items-center">
                <Clock className="h-7 w-7 text-green-600 mr-2" />
                <span className="text-2xl font-bold">
                  {recentActivity
                    ? format(recentActivity, 'h:mm a')
                    : '--'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Second row of cards */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">Attendance Rate</CardTitle>
                <CardDescription className="text-xs">Checked-in vs total workers</CardDescription>
              </div>
              <div className="flex items-center">
                <Percent className="h-7 w-7 text-amber-600 mr-2" />
                <span className="text-3xl font-bold">{attendanceRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">Today&apos;s Check-ins</CardTitle>
                <CardDescription className="text-xs">Workers checked in today</CardDescription>
              </div>
              <div className="flex items-center">
                <Calendar className="h-7 w-7 text-purple-600 mr-2" />
                <span className="text-3xl font-bold">{todayCheckins}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`shadow-sm ${emergencyActive ? 'bg-red-50 border-red-200' : ''}`}>
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-base">Safety Alert</CardTitle>
                  <CardDescription className="text-xs">
                    {emergencyActive ? 'Emergency active - all workers must evacuate' : 'Activate emergency evacuation'}
                  </CardDescription>
                </div>
                <div className="flex items-center">
                  <AlertOctagon className={`h-7 w-7 ${emergencyActive ? 'text-red-600' : 'text-gray-400'} mr-2`} />
                </div>
              </div>
              <Button 
                variant={emergencyActive ? "destructive" : "outline"} 
                className={`mt-2 w-full ${emergencyActive ? 'bg-red-600 hover:bg-red-700' : 'border-red-200 text-red-600 hover:bg-red-50'}`}
                onClick={handleEmergencyToggle}
                disabled={isActivatingEmergency}
              >
                {isActivatingEmergency ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : emergencyActive ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Cancel Emergency
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Activate Emergency
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6">
          <div>
            <CardTitle>Worker Status</CardTitle>
            <CardDescription>Current status of all workers</CardDescription>
          </div>
          {(isLoading || isRefreshing) && (
            <div className="flex items-center text-stone-500 text-sm">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isLoading ? "Loading..." : "Refreshing..."}
            </div>
          )}
        </CardHeader>
        <CardContent className="px-6 pb-6 pt-0">
          {isLoading ? (
            <div className="h-60 flex items-center justify-center">
              <p className="text-stone-500">Loading worker data...</p>
            </div>
          ) : error ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-red-500">{error}</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-stone-500">No workers found for the selected site.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Site</TableHead>
                  <TableHead>Last Check-In</TableHead>
                  <TableHead>Last Check-Out</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkers.map((worker) => (
                  <TableRow 
                    key={worker.id}
                    className={getRowHighlightClass(worker.worker_id)}
                  >
                    <TableCell className="font-medium">{worker.workers.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={worker.is_checked_in ? "default" : "outline"}
                        className={worker.is_checked_in ? "bg-green-500" : ""}
                      >
                        {worker.is_checked_in ? "Checked In" : "Checked Out"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {worker.sites?.name || "N/A"}
                    </TableCell>
                    <TableCell>
                      {worker.last_check_in 
                        ? format(new Date(worker.last_check_in), 'MMM d, h:mm a')
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      {worker.last_check_out 
                        ? format(new Date(worker.last_check_out), 'MMM d, h:mm a')
                        : 'Never'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 