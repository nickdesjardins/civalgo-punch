'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getCheckEvents, getWorkers, getSites, CheckInEvent, Worker as WorkerType, Site as SiteType } from '@/lib/supabase';

// Extend CheckInEvent to include the joined worker data
interface CheckEvent extends Omit<CheckInEvent, 'workers'> {
  workers: {
    id: string;
    name: string;
  };
}

// Interface for filter form
interface FilterFormValues {
  workerId: string;
  startDate: string;
  endDate: string;
  siteId: string;
}

export default function HistoryPage() {
  const [events, setEvents] = useState<CheckEvent[]>([]);
  const [workers, setWorkers] = useState<WorkerType[]>([]);
  const [sites, setSites] = useState<SiteType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Initialize form
  const form = useForm<FilterFormValues>({
    defaultValues: {
      workerId: 'all',
      startDate: '',
      endDate: '',
      siteId: 'all',
    },
  });

  // Fetch events with optional filtering
  const fetchEvents = useCallback(async (filters?: Partial<FilterFormValues>) => {
    if (!sites.length) return;

    setIsLoading(true);
    setError(null);
    
    try {
      let allEvents: CheckEvent[] = [];
      
      if (filters?.siteId === 'all') {
        // For "all sites", fetch events for each site
        const allSitesPromises = sites.map(site => 
          getCheckEvents({
            siteId: site.id,
            workerId: filters?.workerId !== 'all' ? filters?.workerId : undefined,
          })
        );
        
        const allSitesData = await Promise.all(allSitesPromises);
        // Fix the type issue by ensuring we get the right type
        allEvents = allSitesData.flat() as unknown as CheckEvent[];
      } else if (filters?.siteId) {
        // For a specific site, fetch events
        const data = await getCheckEvents({
          siteId: filters.siteId,
          workerId: filters?.workerId !== 'all' ? filters?.workerId : undefined,
        });
        allEvents = data as unknown as CheckEvent[];
      } else {
        setEvents([]);
        setIsLoading(false);
        return;
      }
      
      // Apply date filtering client-side
      if (filters?.startDate || filters?.endDate) {
        allEvents = allEvents.filter(event => {
          const eventDate = new Date(event.timestamp);
          const localDate = new Date(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate()
          ).toISOString().substring(0, 10);
          
          if (filters.startDate && localDate < filters.startDate) return false;
          if (filters.endDate && localDate > filters.endDate) return false;
          
          return true;
        });
      }
      
      // Sort by timestamp (descending)
      allEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setEvents(allEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load check-in/out events. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [sites]);

  // Unified filter handler
  const handleFilterChange = useCallback((field: keyof FilterFormValues, value: string) => {
    form.setValue(field, value);
    
    // Get all current values for the filter
    const values = form.getValues();
    const filters: Partial<FilterFormValues> = {
      siteId: values.siteId,
      workerId: values.workerId !== 'all' ? values.workerId : undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined
    };
    
    fetchEvents(filters);
  }, [form, fetchEvents]);

  // Reset filters
  const resetFilters = useCallback(() => {
    form.reset({
      workerId: 'all',
      startDate: '',
      endDate: '',
      siteId: 'all',
    });
    fetchEvents({ siteId: 'all' });
  }, [form, fetchEvents]);

  // Pagination utilities
  const totalPages = Math.ceil(events.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, events.length);
  const paginatedEvents = events.slice(startIndex, endIndex);

  // Handle page navigation
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    document.querySelector('.check-events-table')?.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((size: string) => {
    setPageSize(parseInt(size));
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  // Load data when component mounts
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        // Load sites and workers in parallel
        const [sitesData, workersData] = await Promise.all([getSites(), getWorkers()]);
        setSites(sitesData as SiteType[]);
        setWorkers(workersData as WorkerType[]);
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load initial data. Please try again later.');
      }
    }
    
    loadInitialData();
  }, []);
  
  // Load events after sites are available
  useEffect(() => {
    if (sites.length > 0) {
      fetchEvents({ siteId: 'all' });
    }
  }, [sites, fetchEvents]);

  // Reset to first page when events change
  useEffect(() => {
    setCurrentPage(1);
  }, [events]);

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Check-In/Out History</h1>
          <p className="text-stone-600 mt-1">View and filter historical check-in/out events</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-stone-600">Site:</span>
          <Select 
            onValueChange={(value) => handleFilterChange('siteId', value)}
            value={form.watch('siteId')}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Construction Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All construction sites</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Filter Events</CardTitle>
            <CardDescription>
              Narrow down results by worker, date range, or both
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={resetFilters} className="ml-auto">
            Reset Filters
          </Button>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="workerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Worker</FormLabel>
                    <Select 
                      onValueChange={(value) => handleFilterChange('workerId', value)} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="All workers" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All workers</SelectItem>
                        {workers.map((worker) => (
                          <SelectItem key={worker.id} value={worker.id}>
                            {worker.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        value={field.value} 
                        onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        value={field.value} 
                        onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check-In/Out Events</CardTitle>
          <CardDescription>
            Historical record of all worker check-ins and check-outs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-60 flex items-center justify-center">
              <p className="text-stone-500">Loading events...</p>
            </div>
          ) : error ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-red-500">{error}</p>
            </div>
          ) : events.length === 0 ? (
            <div className="h-40 flex items-center justify-center">
              <p className="text-stone-500">No events found for the selected filters.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-end mb-4 space-x-2">
                <span className="text-sm text-stone-600">Rows per page:</span>
                <Select
                  value={pageSize.toString()}
                  onValueChange={handlePageSizeChange}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue placeholder="50" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Table className="check-events-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Worker Name</TableHead>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.workers.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={event.event_type === 'check_in' ? 'default' : 'outline'}
                          className={event.event_type === 'check_in' ? 'bg-green-500' : ''}
                        >
                          {event.event_type === 'check_in' ? 'Check In' : 'Check Out'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(event.timestamp), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(new Date(event.timestamp), 'h:mm a')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-stone-600">
                    Showing {startIndex + 1}-{endIndex} of {events.length} records
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="flex items-center">
                      <span className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 