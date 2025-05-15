import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { testApiConnection, api } from '@/services/api';
import { Input } from '@/components/ui/input';

interface ApiTestResult {
  url: string;
  success: boolean;
  status?: number;
  duration?: number;
  error?: string;
}

export function ApiConnectionTester() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  
  const testConnections = async () => {
    setIsLoading(true);
    
    // Generate URLs to test based on the current hostname
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    const urlsToTest = [
      `${protocol}//${hostname}:8000`, // Same hostname, port 8000
      `${protocol}//api.${hostname}`, // API subdomain
      window.location.origin, // Same origin
      'http://localhost:8000', // localhost fallback
    ];
    
    // Add custom URL if provided
    if (customUrl && !urlsToTest.includes(customUrl)) {
      urlsToTest.push(customUrl);
    }
    
    try {
      const testResult = await testApiConnection(urlsToTest);
      
      // Format results for display
      const formattedResults = Object.entries(testResult.results).map(([url, result]) => ({
        url,
        ...result
      }));
      
      setResults(formattedResults);
      setSelectedUrl(testResult.bestUrl);
    } catch (error) {
      console.error('Error testing API connections:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const applySelectedUrl = () => {
    if (selectedUrl) {
      api.setBaseUrl(selectedUrl);
      // Reload the page to apply the new base URL
      window.location.reload();
    }
  };
  
  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        className="mt-2 w-full"
        onClick={() => setIsOpen(true)}
      >
        Test API Connection
      </Button>
    );
  }
  
  return (
    <Card className="w-full mt-2">
      <CardHeader>
        <CardTitle>API Connection Tester</CardTitle>
        <CardDescription>
          If you're experiencing connection issues, use this tool to diagnose and fix problems.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Custom API URL (e.g., http://api.example.com)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={testConnections} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connections'
              )}
            </Button>
          </div>
          
          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Test Results:</h3>
              {results.map((result) => (
                <div 
                  key={result.url} 
                  className={`border rounded-md p-3 flex items-center justify-between ${
                    result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  } ${selectedUrl === result.url ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedUrl(result.url)}
                >
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{result.url}</p>
                      {result.success ? (
                        <p className="text-xs text-gray-500">
                          Response: {result.status} ({result.duration}ms)
                        </p>
                      ) : (
                        <p className="text-xs text-red-500">{result.error}</p>
                      )}
                    </div>
                  </div>
                  {selectedUrl === result.url && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {selectedUrl && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ready to apply changes</AlertTitle>
              <AlertDescription>
                You've selected {selectedUrl} as your API endpoint. 
                Click "Apply and Reload" to use this URL for future API requests.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setIsOpen(false)}>
          Close
        </Button>
        {selectedUrl && (
          <Button onClick={applySelectedUrl}>
            Apply and Reload
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 