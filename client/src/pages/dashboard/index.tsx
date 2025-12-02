import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Phone,
  FileText,
  Clock,
  Play,
  Pause,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAuth } from "@/lib/auth";
const stats = [
  {
    title: "Total Bids",
    value: "1,234",
    change: "+12.5%",
    trend: "up",
    icon: FileText,
  },
  {
    title: "Messages Received",
    value: "456",
    change: "+8.2%",
    trend: "up",
    icon: MessageSquare,
  },
  {
    title: "Contacts Made",
    value: "89",
    change: "-2.4%",
    trend: "down",
    icon: Phone,
  },
  {
    title: "Success Rate",
    value: "32.5%",
    change: "+5.1%",
    trend: "up",
    icon: TrendingUp,
  },
];

const bidTrendData = [
  { date: "Mon", bids: 45, messages: 12, contacts: 3 },
  { date: "Tue", bids: 52, messages: 15, contacts: 4 },
  { date: "Wed", bids: 48, messages: 18, contacts: 5 },
  { date: "Thu", bids: 61, messages: 21, contacts: 6 },
  { date: "Fri", bids: 55, messages: 17, contacts: 4 },
  { date: "Sat", bids: 38, messages: 10, contacts: 2 },
  { date: "Sun", bids: 42, messages: 14, contacts: 3 },
];

const recentBids = [
  { id: 1, title: "WordPress E-commerce Site", budget: "$500-$1000", status: "replied", time: "2h ago" },
  { id: 2, title: "React Native Mobile App", budget: "$2000-$3000", status: "sent", time: "4h ago" },
  { id: 3, title: "Landing Page Design", budget: "$300-$500", status: "contacted", time: "6h ago" },
  { id: 4, title: "API Integration Project", budget: "$800-$1200", status: "sent", time: "8h ago" },
  { id: 5, title: "Full Stack Web App", budget: "$3000-$5000", status: "replied", time: "10h ago" },
];

export default function Dashboard() {
  const { telegramUser } = useAuth();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's an overview of your bidding performance
        </p>
      </div>

      {/* Auto-Bid Status Card */}
      <Card className="border-primary/50">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
          <div>
            <CardTitle>Auto-Bid Status</CardTitle>
            <CardDescription>Your automated bidding is currently active</CardDescription>
          </div>
          <Button variant="outline" className="gap-2" data-testid="button-toggle-auto-bid">
            <Pause className="h-4 w-4" />
            Pause Auto-Bid
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <Clock className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Schedule</p>
                <p className="text-sm font-medium">Mon-Fri, 9:00-18:00</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Templates</p>
                <p className="text-sm font-medium">8 Active Templates</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <TrendingUp className="h-10 w-10 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Budget Range</p>
                <p className="text-sm font-medium">$500 - $3000</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                {stat.value}
              </div>
              <div className="flex items-center gap-1 text-xs mt-1">
                {stat.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={stat.trend === "up" ? "text-green-500" : "text-red-500"}>
                  {stat.change}
                </span>
                <span className="text-muted-foreground">from last week</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bid Trend (Last 7 Days)</CardTitle>
            <CardDescription>Your bidding activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bidTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bids"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    name="Bids"
                  />
                  <Line
                    type="monotone"
                    dataKey="messages"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    name="Messages"
                  />
                  <Line
                    type="monotone"
                    dataKey="contacts"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    name="Contacts"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
            <CardDescription>Bids vs messages vs contacts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bidTrendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="bids" fill="hsl(var(--chart-1))" name="Bids" />
                  <Bar dataKey="messages" fill="hsl(var(--chart-2))" name="Messages" />
                  <Bar dataKey="contacts" fill="hsl(var(--chart-3))" name="Contacts" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bids Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bids</CardTitle>
          <CardDescription>Your latest bidding activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-sm font-medium">Project</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Budget</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentBids.map((bid) => (
                  <tr key={bid.id} className="border-b hover-elevate" data-testid={`row-bid-${bid.id}`}>
                    <td className="py-3 px-4 text-sm" data-testid={`text-bid-title-${bid.id}`}>
                      {bid.title}
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                      {bid.budget}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          bid.status === "contacted"
                            ? "default"
                            : bid.status === "replied"
                            ? "secondary"
                            : "outline"
                        }
                        data-testid={`badge-status-${bid.id}`}
                      >
                        {bid.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {bid.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
