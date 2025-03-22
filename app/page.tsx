import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Clock, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto py-12 px-4 max-w-5xl">
      <div className="flex flex-col items-center text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Worker Check-In System</h1>
        <p className="text-xl text-stone-600 max-w-2xl">
          A simple, real-time system for construction site workers to check in and out.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Worker Check In/Out</CardTitle>
            <CardDescription>
              Check in when you arrive at the site or check out when you leave
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-4">
            <Clock className="text-stone-600" size={64} />
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/worker">
              <Button size="lg">
                Go to Worker Portal
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Supervisor Dashboard</CardTitle>
            <CardDescription>
              View real-time check-in status and historical records
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-4">
            <BarChart3 className="text-stone-600" size={64} />
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/dashboard">
              <Button size="lg">
                Go to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="bg-stone-100 p-6 rounded-lg shadow">
        <h2 className="text-2xl font-semibold mb-4">About This Project</h2>
        <p className="mb-4">
          This Worker Check-In System provides a digital solution for construction sites, replacing physical punch-in machines. 
          It offers real-time visibility of on-site workers, improving safety and compliance.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium mb-2">Safety First</h3>
            <p className="text-sm text-stone-600">
              In case of emergency, supervisors can quickly see who is on-site.
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium mb-2">Compliance</h3>
            <p className="text-sm text-stone-600">
              Keep accurate attendance logs for legal and insurance purposes.
            </p>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-medium mb-2">Operational Efficiency</h3>
            <p className="text-sm text-stone-600">
              Real-time workforce data helps with planning and resource allocation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
