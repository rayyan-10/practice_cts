import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDebugData() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        // Get profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*');

        // Get organizations
        const { data: organizations } = await supabase
          .from('organizations')
          .select('*');

        // Get organization members
        const { data: members } = await supabase
          .from('organization_members')
          .select(`
            *,
            organization:organizations(*),
            profile:profiles(*)
          `);

        // Get ACOs
        const { data: acos } = await supabase
          .from('acos')
          .select('*');

        setData({
          currentUser: user,
          profiles,
          organizations,
          members,
          acos,
        });
      } catch (error) {
        console.error('Debug error:', error);
        setData({ error: String(error) });
      } finally {
        setLoading(false);
      }
    }

    fetchDebugData();
  }, []);

  if (loading) {
    return <div className="p-8">Loading debug data...</div>;
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6">Database Debug Information</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(data.currentUser, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profiles ({data.profiles?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(data.profiles, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organizations ({data.organizations?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(data.organizations, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Organization Members ({data.members?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(data.members, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ACOs ({data.acos?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(data.acos, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {data.error && (
          <Card className="border-red-500">
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-red-50 p-4 rounded text-xs overflow-auto text-red-800">
                {data.error}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
