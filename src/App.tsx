import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Command,
  Download,
  FileText,
  Globe2,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Moon,
  MoreHorizontal,
  Package,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  categories,
  paymentStatuses,
  regions,
  trafficSources,
  transactions,
  type TrafficSource,
  type Transaction,
  type TrendPoint,
} from './data'
import './App.css'

type DateRange = '7d' | '30d' | '90d' | 'ytd'
type PageName = 'Overview' | 'Revenue Analytics' | 'Customer Insights' | 'Product Performance' | 'Reports' | 'Settings'
type MenuName = 'date' | 'notifications' | 'profile' | null
type TrendMode = 'Daily' | 'Weekly' | 'Monthly'
type SortKey = 'id' | 'customer' | 'date' | 'category' | 'region' | 'revenue' | 'status'

const rangeOptions: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
]

const navigation: { label: PageName; icon: LucideIcon }[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Revenue Analytics', icon: Activity },
  { label: 'Customer Insights', icon: Users },
  { label: 'Product Performance', icon: Package },
  { label: 'Reports', icon: FileText },
  { label: 'Settings', icon: Settings },
]

const chartColors = ['#b9e769', '#f48466', '#68a6a0', '#d8ab50', '#8291c7', '#d48caa']
const sourceColors = ['#b9e769', '#68a6a0', '#f48466', '#d8ab50', '#8291c7']
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const compactUsd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 })
const numberFormat = new Intl.NumberFormat('en-US')
const sampleEnd = new Date('2026-10-12T12:00:00.000Z')
const copyrightYear = new Date().getFullYear()

function formatDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', options ?? { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00.000Z`))
}

function getBounds(range: DateRange, previous = false) {
  const end = new Date(sampleEnd)
  const start = new Date(sampleEnd)

  if (range === 'ytd') {
    if (previous) {
      start.setUTCFullYear(start.getUTCFullYear() - 1, 0, 1)
      end.setUTCFullYear(end.getUTCFullYear() - 1)
    } else {
      start.setUTCMonth(0, 1)
    }
  } else {
    const days = Number.parseInt(range, 10)
    start.setUTCDate(start.getUTCDate() - days + 1 - (previous ? days : 0))
    if (previous) end.setUTCDate(end.getUTCDate() - days)
  }

  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
}

function filterRecords(range: DateRange, category: string, region: string, previous = false) {
  const bounds = getBounds(range, previous)
  return transactions.filter((transaction) =>
    transaction.date >= bounds.start &&
    transaction.date <= bounds.end &&
    (category === 'All categories' || transaction.category === category) &&
    (region === 'All regions' || transaction.region === region),
  )
}

function revenueOf(records: Transaction[]) {
  return records.reduce((total, record) => total + (record.status === 'Refunded' ? 0 : record.revenue), 0)
}

function uniqueCustomers(records: Transaction[]) {
  return new Set(records.map((record) => record.customer)).size
}

function compareChange(current: number, previous: number) {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

function aggregateTrend(records: Transaction[], mode: TrendMode): TrendPoint[] {
  const buckets = new Map<string, TrendPoint>()

  for (const record of records) {
    const date = new Date(`${record.date}T12:00:00.000Z`)
    let key = record.date
    if (mode === 'Weekly') {
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
      key = date.toISOString().slice(0, 10)
    } else if (mode === 'Monthly') {
      key = `${record.date.slice(0, 7)}-01`
    }

    const point = buckets.get(key) ?? {
      date: key,
      label: mode === 'Monthly' ? formatDate(key, { month: 'short', year: '2-digit', timeZone: 'UTC' }) : formatDate(key),
      revenue: 0,
      orders: 0,
      newCustomers: 0,
      returningCustomers: 0,
    }
    point.revenue += record.status === 'Refunded' ? 0 : record.revenue
    point.orders += 1
    if (record.returning) point.returningCustomers += 1
    else point.newCustomers += 1
    buckets.set(key, point)
  }

  return [...buckets.values()].sort((left, right) => left.date.localeCompare(right.date))
}

function summarize(records: Transaction[], key: 'category' | 'region' | 'source') {
  const totals = new Map<string, number>()
  for (const record of records) {
    const label = record[key]
    totals.set(label, (totals.get(label) ?? 0) + (key === 'source' ? 1 : record.status === 'Refunded' ? 0 : record.revenue))
  }
  return [...totals.entries()].map(([name, value]) => ({ name, value })).sort((left, right) => right.value - left.value)
}

function ChartTooltip({ active, payload, label, money = false }: {
  active?: boolean
  payload?: { name?: string; value?: number | string; color?: string }[]
  label?: string
  money?: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <div className="tooltip-row" key={entry.name}>
          <span className="tooltip-dot" style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <b>{money && entry.name === 'Revenue' ? usd.format(Number(entry.value ?? 0)) : numberFormat.format(Number(entry.value ?? 0))}</b>
        </div>
      ))}
    </div>
  )
}

function Panel({ title, subtitle, action, children, className = '' }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function TrendChart({ data, mode, onModeChange, tall = false }: {
  data: TrendPoint[]
  mode: TrendMode
  onModeChange: (mode: TrendMode) => void
  tall?: boolean
}) {
  const modeOptions: TrendMode[] = ['Daily', 'Weekly', 'Monthly']
  return (
    <>
      <div className="chart-toolbar">
        <div className="chart-key">
          <span><i className="key-dot lime" />Revenue</span>
          <span><i className="key-dot coral" />Orders</span>
        </div>
        <div className="segmented-control" aria-label="Chart interval">
          {modeOptions.map((option) => (
            <button className={mode === option ? 'selected' : ''} key={option} onClick={() => onModeChange(option)} type="button">
              {option}
            </button>
          ))}
        </div>
      </div>
      <div className={`chart-area ${tall ? 'chart-area-tall' : ''}`}>
        {data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9bcf4d" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#9bcf4d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis yAxisId="revenue" tickLine={false} axisLine={false} width={48} tickFormatter={(value: number) => compactUsd.format(value)} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <YAxis yAxisId="orders" orientation="right" tickLine={false} axisLine={false} width={28} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
              <Tooltip content={<ChartTooltip money />} />
              <Area yAxisId="revenue" type="monotone" dataKey="revenue" name="Revenue" stroke="#779e39" strokeWidth={2.5} fill="url(#revenueFill)" activeDot={{ r: 4, fill: '#779e39', stroke: 'var(--surface)', strokeWidth: 2 }} />
              <Line yAxisId="orders" type="monotone" dataKey="orders" name="Orders" stroke="#e98268" strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">No activity in this selection.</div>}
      </div>
    </>
  )
}

function CategoryChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <>
      <div className="donut-wrap">
        {total > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="67%" outerRadius="88%" paddingAngle={3} stroke="none">
                  {data.map((item) => <Cell key={item.name} fill={chartColors[Math.max(0, categories.indexOf(item.name as (typeof categories)[number]))]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip money />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center"><span>Net revenue</span><strong>{compactUsd.format(total)}</strong></div>
          </>
        ) : <div className="chart-empty">No category data.</div>}
      </div>
      <div className="legend-list">
        {data.slice(0, 5).map((item) => (
          <div className="legend-item" key={item.name}>
            <span className="legend-label"><i className="key-dot" style={{ background: chartColors[Math.max(0, categories.indexOf(item.name as (typeof categories)[number]))] }} />{item.name}</span>
            <span>{total ? `${Math.round((item.value / total) * 100)}%` : '0%'}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function AcquisitionChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="chart-area chart-area-medium">
      {data.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingTop: 6 }} />
            <Bar dataKey="newCustomers" name="New customers" stackId="customers" fill="#b9e769" radius={[3, 3, 0, 0]} />
            <Bar dataKey="returningCustomers" name="Returning" stackId="customers" fill="#68a6a0" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : <div className="chart-empty">No customer activity.</div>}
    </div>
  )
}

function SalesChart({ data }: { data: { name: string; value: number; orders: number }[] }) {
  const sales = data.map((item) => ({ name: item.name, revenue: item.value, orders: item.orders }))
  return (
    <div className="chart-area chart-area-medium">
      {sales.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sales} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={42} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
            <YAxis yAxisId="revenue" tickLine={false} axisLine={false} tickFormatter={(value: number) => compactUsd.format(value)} width={50} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
            <YAxis yAxisId="orders" orientation="right" tickLine={false} axisLine={false} width={28} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
            <Tooltip content={<ChartTooltip money />} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: 'var(--muted)', paddingTop: 3 }} />
            <Bar yAxisId="revenue" dataKey="revenue" name="Revenue" fill="#b9e769" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar yAxisId="orders" dataKey="orders" name="Orders" fill="#e98268" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      ) : <div className="chart-empty">No sales in this selection.</div>}
    </div>
  )
}

function RegionChart({ data }: { data: { name: string; value: number }[] }) {
  const topRegions = data.slice(0, 6)
  return (
    <div className="chart-area chart-area-medium">
      {topRegions.length ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topRegions} layout="vertical" margin={{ top: 1, right: 8, left: 12, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" strokeDasharray="3 5" />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value: number) => compactUsd.format(value)} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
            <YAxis type="category" dataKey="name" width={98} tickLine={false} axisLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} />
            <Tooltip content={<ChartTooltip money />} />
            <Bar dataKey="value" name="Revenue" fill="#68a6a0" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      ) : <div className="chart-empty">No regional data.</div>}
    </div>
  )
}

function TrafficChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  return (
    <>
      <div className="traffic-layout">
        <div className="traffic-donut">
          {total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="91%" paddingAngle={2} stroke="none">
                  {data.map((item) => <Cell key={item.name} fill={sourceColors[Math.max(0, trafficSources.indexOf(item.name as TrafficSource))]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty">No traffic data.</div>}
        </div>
        <div className="traffic-legend">
          {data.map((item) => (
            <div className="legend-item" key={item.name}>
              <span className="legend-label"><i className="key-dot" style={{ background: sourceColors[Math.max(0, trafficSources.indexOf(item.name as TrafficSource))] }} />{item.name}</span>
              <b>{total ? `${Math.round((item.value / total) * 100)}%` : '0%'}</b>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function MetricCard({ label, value, change, icon: Icon, data, hint }: {
  label: string
  value: string
  change: number
  icon: LucideIcon
  data: TrendPoint[]
  hint: string
}) {
  const positive = change >= 0
  return (
    <article className="metric-card" title={hint}>
      <div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon size={16} strokeWidth={1.8} /></span></div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-bottom">
        <span className={`metric-change ${positive ? 'positive' : 'negative'}`} aria-label={`${positive ? 'Increased' : 'Decreased'} ${Math.abs(change).toFixed(1)} percent compared with previous period`}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(change).toFixed(1)}%
        </span>
        <span className="metric-compare">vs previous</span>
        <div className="sparkline" aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="revenue" stroke={positive ? '#779e39' : '#dc745d'} strokeWidth={1.8} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </article>
  )
}

export default function App() {
  const [activePage, setActivePage] = useState<PageName>('Overview')
  const [range, setRange] = useState<DateRange>('30d')
  const [category, setCategory] = useState('All categories')
  const [region, setRegion] = useState('All regions')
  const [trendMode, setTrendMode] = useState<TrendMode>('Daily')
  const [query, setQuery] = useState('')
  const [tableStatus, setTableStatus] = useState('All statuses')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortAscending, setSortAscending] = useState(false)
  const [page, setPage] = useState(1)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [openMenu, setOpenMenu] = useState<MenuName>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState('')

  const currentRecords = useMemo(() => filterRecords(range, category, region), [range, category, region])
  const previousRecords = useMemo(() => filterRecords(range, category, region, true), [range, category, region])
  const trendData = useMemo(() => aggregateTrend(currentRecords, trendMode), [currentRecords, trendMode])
  const categoryData = useMemo(() => summarize(currentRecords, 'category'), [currentRecords])
  const regionData = useMemo(() => summarize(currentRecords, 'region'), [currentRecords])
  const sourceData = useMemo(() => summarize(currentRecords, 'source'), [currentRecords])
  const salesData = useMemo(() => categoryData.map((item) => ({
    ...item,
    orders: currentRecords.filter((record) => record.category === item.name).length,
  })), [categoryData, currentRecords])
  const metrics = useMemo(() => {
    const calculate = (records: Transaction[]) => {
      const revenue = revenueOf(records)
      const orders = records.length
      const customers = uniqueCustomers(records)
      const sessions = records.reduce((total, record) => total + (record.source === 'Direct' ? 6 : record.source === 'Paid campaigns' ? 10 : 8), 0)
      const returning = records.filter((record) => record.returning).length
      return {
        revenue,
        orders,
        customers,
        conversion: sessions ? (orders / sessions) * 100 : 0,
        averageOrder: orders ? revenue / orders : 0,
        retention: orders ? (returning / orders) * 100 : 0,
      }
    }
    return { current: calculate(currentRecords), previous: calculate(previousRecords) }
  }, [currentRecords, previousRecords])

  const filteredTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = currentRecords.filter((transaction) =>
      (!normalizedQuery || transaction.id.toLowerCase().includes(normalizedQuery) || transaction.customer.toLowerCase().includes(normalizedQuery)) &&
      (tableStatus === 'All statuses' || transaction.status === tableStatus),
    )
    return filtered.sort((left, right) => {
      const leftValue = left[sortKey]
      const rightValue = right[sortKey]
      const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue))
      return sortAscending ? comparison : -comparison
    })
  }, [currentRecords, query, sortKey, sortAscending, tableStatus])

  const pageSize = 8
  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / pageSize))
  const visibleTransactions = filteredTransactions.slice((page - 1) * pageSize, page * pageSize)
  const rangeLabel = rangeOptions.find((option) => option.value === range)?.label ?? 'Last 30 days'
  const title = activePage === 'Overview' ? 'Business overview' : activePage
  const subtitle = activePage === 'Overview'
    ? 'A clear view of what is moving your business forward.'
    : activePage === 'Settings'
      ? 'Tune your workspace and sample data preferences.'
      : `Explore ${activePage.toLowerCase()} across your current reporting window.`

  function notify(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  function resetDashboard() {
    setRange('30d')
    setCategory('All categories')
    setRegion('All regions')
    setTrendMode('Daily')
    setQuery('')
    setTableStatus('All statuses')
    setSortKey('date')
    setSortAscending(false)
    setPage(1)
    setOpenMenu(null)
    notify('Dashboard reset to its default view')
  }

  function exportCsv() {
    if (!filteredTransactions.length) {
      notify('There are no matching transactions to export')
      return
    }
    const columns = ['Transaction ID', 'Customer', 'Date', 'Product', 'Category', 'Region', 'Revenue', 'Payment status']
    const rows = filteredTransactions.map((transaction) => [
      transaction.id,
      transaction.customer,
      transaction.date,
      transaction.product,
      transaction.category,
      transaction.region,
      transaction.revenue.toFixed(2),
      transaction.status,
    ])
    const csv = [columns, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const link = document.createElement('a')
    const objectUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.href = objectUrl
    link.download = `pinjari-insights-transactions-${range}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    notify(`${numberFormat.format(filteredTransactions.length)} filtered records exported`)
  }

  function changeSort(key: SortKey) {
    setPage(1)
    if (sortKey === key) setSortAscending((ascending) => !ascending)
    else {
      setSortKey(key)
      setSortAscending(true)
    }
  }

  function sortIndicator(key: SortKey) {
    return <span className="sort-mark">{sortKey === key ? (sortAscending ? '↑' : '↓') : '↕'}</span>
  }

  const currentTrend = trendData.length ? trendData : []
  const bestRegion = regionData[0]
  const bestSource = sourceData[0]
  const rangeDateText = `${formatDate(getBounds(range).start)} – ${formatDate(getBounds(range).end, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`
  const metricCards = [
    { label: 'Total revenue', value: usd.format(metrics.current.revenue), change: compareChange(metrics.current.revenue, metrics.previous.revenue), icon: Activity, hint: 'Net sales after refunded transactions.' },
    { label: 'Total orders', value: numberFormat.format(metrics.current.orders), change: compareChange(metrics.current.orders, metrics.previous.orders), icon: ShoppingBag, hint: 'All orders in the selected reporting window.' },
    { label: 'Active customers', value: numberFormat.format(metrics.current.customers), change: compareChange(metrics.current.customers, metrics.previous.customers), icon: Users, hint: 'Unique fictional customers with an order in this period.' },
    { label: 'Conversion rate', value: `${metrics.current.conversion.toFixed(1)}%`, change: compareChange(metrics.current.conversion, metrics.previous.conversion), icon: Zap, hint: 'Orders divided by estimated demo sessions.' },
    { label: 'Average order value', value: usd.format(metrics.current.averageOrder), change: compareChange(metrics.current.averageOrder, metrics.previous.averageOrder), icon: ShoppingBag, hint: 'Net revenue divided by all orders.' },
    { label: 'Customer retention', value: `${metrics.current.retention.toFixed(1)}%`, change: compareChange(metrics.current.retention, metrics.previous.retention), icon: Users, hint: 'Share of demo orders attributed to returning customers.' },
  ]

  function transactionTable() {
    return (
      <Panel
        title="Latest transactions"
        subtitle={`${numberFormat.format(filteredTransactions.length)} records · ${rangeDateText}`}
        className="table-panel"
        action={<button className="quiet-button" onClick={exportCsv} type="button"><Download size={15} />Export CSV</button>}
      >
        <div className="table-controls">
          <label className="table-search"><Search size={15} /><input aria-label="Search transactions by ID or customer" onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Search ID or customer" value={query} /></label>
          <label className="select-wrap compact-select"><span className="sr-only">Filter by payment status</span><select onChange={(event) => { setTableStatus(event.target.value); setPage(1) }} value={tableStatus}><option>All statuses</option>{paymentStatuses.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={14} /></label>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr>
              {([['id', 'Transaction'], ['customer', 'Customer'], ['date', 'Date'], ['category', 'Category'], ['region', 'Region'], ['revenue', 'Revenue'], ['status', 'Status']] as [SortKey, string][]).map(([key, label]) => (
                <th key={key}><button className="sort-button" onClick={() => changeSort(key)} type="button">{label}{sortIndicator(key)}</button></th>
              ))}
            </tr></thead>
            <tbody>
              {visibleTransactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} />)}
              {!visibleTransactions.length && <tr><td className="table-empty" colSpan={7}><Search size={20} /><strong>No matching transactions</strong><span>Try changing the search or filters.</span></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer"><span>Showing {filteredTransactions.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, filteredTransactions.length)} of {numberFormat.format(filteredTransactions.length)}</span><div className="pagination"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} type="button"><ChevronLeft size={16} /></button><span>{page} / {pageCount}</span><button aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} type="button"><ChevronRight size={16} /></button></div></div>
      </Panel>
    )
  }

  function overviewContent() {
    return (
      <>
        <div className="metrics-grid">{metricCards.map((metric) => <MetricCard key={metric.label} {...metric} data={currentTrend} />)}</div>
        <div className="content-grid content-grid-primary">
          <Panel title="Revenue over time" subtitle="Net revenue and order activity" className="trend-panel" action={<span className="panel-period"><CalendarDays size={14} />{rangeLabel}</span>}>
            <TrendChart data={currentTrend} mode={trendMode} onModeChange={setTrendMode} />
          </Panel>
          <Panel title="Revenue by category" subtitle="Share of net revenue"><CategoryChart data={categoryData} /></Panel>
        </div>
        <div className="content-grid content-grid-secondary">
          <Panel title="Customer acquisition" subtitle="New and returning order activity"><AcquisitionChart data={currentTrend} /></Panel>
          <Panel title="Regional performance" subtitle="Revenue by customer region"><RegionChart data={regionData} /></Panel>
        </div>
        <div className="content-grid content-grid-secondary">
          <Panel title="Sales performance" subtitle="Revenue and order volume by category"><SalesChart data={salesData} /></Panel>
          <Panel title="Traffic sources" subtitle="Where demo orders originated"><TrafficChart data={sourceData} /></Panel>
        </div>
        <InsightStrip region={bestRegion} source={bestSource} average={metrics.current.averageOrder} />
        {transactionTable()}
      </>
    )
  }

  function pageContent() {
    if (activePage === 'Overview') return overviewContent()
    if (activePage === 'Revenue Analytics') return (
      <>
        <div className="metrics-grid metrics-grid-compact">{metricCards.slice(0, 3).map((metric) => <MetricCard key={metric.label} {...metric} data={currentTrend} />)}</div>
        <div className="content-grid content-grid-primary"><Panel title="Revenue over time" subtitle="Daily, weekly and monthly net sales" className="trend-panel"><TrendChart data={currentTrend} mode={trendMode} onModeChange={setTrendMode} tall /></Panel><Panel title="Revenue by category" subtitle="Share of selected period"><CategoryChart data={categoryData} /></Panel></div>
        <div className="content-grid content-grid-secondary"><Panel title="Regional performance" subtitle="Net sales by region"><RegionChart data={regionData} /></Panel><Panel title="Sales performance" subtitle="Revenue and order volume by category"><SalesChart data={salesData} /></Panel></div>
        {transactionTable()}
      </>
    )
    if (activePage === 'Customer Insights') return (
      <>
        <div className="metrics-grid metrics-grid-compact">{metricCards.slice(2, 4).concat(metricCards.slice(5, 6)).map((metric) => <MetricCard key={metric.label} {...metric} data={currentTrend} />)}</div>
        <div className="content-grid content-grid-primary"><Panel title="Customer acquisition" subtitle="New and returning order activity"><AcquisitionChart data={currentTrend} /></Panel><Panel title="Traffic sources" subtitle="Orders by discovery channel"><TrafficChart data={sourceData} /></Panel></div>
        <Panel title="Regional customer activity" subtitle="Revenue contribution by region"><RegionChart data={regionData} /></Panel>
        {transactionTable()}
      </>
    )
    if (activePage === 'Product Performance') return (
      <>
        <div className="metrics-grid metrics-grid-compact">{metricCards.slice(0, 2).concat(metricCards.slice(4, 5)).map((metric) => <MetricCard key={metric.label} {...metric} data={currentTrend} />)}</div>
        <div className="content-grid content-grid-primary"><Panel title="Revenue by category" subtitle="Category share of net revenue"><CategoryChart data={categoryData} /></Panel><Panel title="Sales performance" subtitle="Revenue and order volume by category"><SalesChart data={salesData} /></Panel></div>
        <Panel title="Regional performance" subtitle="Where products are selling"><RegionChart data={regionData} /></Panel>
        {transactionTable()}
      </>
    )
    if (activePage === 'Reports') return <>{transactionTable()}<div className="report-note"><FileText size={18} /><div><strong>Report data is ready to export</strong><span>CSV exports use the date, category, region, status, and search filters currently applied.</span></div><button className="quiet-button" onClick={exportCsv} type="button"><Download size={15} />Export filtered data</button></div></>
    return (
      <div className="settings-layout">
        <Panel title="Workspace appearance" subtitle="Your preferences are saved for this session.">
          <div className="settings-row"><div className="settings-icon"><Sun size={18} /></div><div className="settings-copy"><strong>Color theme</strong><span>Choose a comfortable display for your workspace.</span></div><button className="theme-switch" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} type="button">{theme === 'light' ? <><Sun size={15} />Light</> : <><Moon size={15} />Dark</>}</button></div>
          <div className="settings-row"><div className="settings-icon"><CalendarDays size={18} /></div><div className="settings-copy"><strong>Default reporting period</strong><span>Set the starting date range when you reset the dashboard.</span></div><span className="settings-value">Last 30 days</span></div>
          <div className="settings-row"><div className="settings-icon"><Globe2 size={18} /></div><div className="settings-copy"><strong>Currency display</strong><span>Revenue values use a single reporting currency.</span></div><span className="settings-value">USD · $</span></div>
        </Panel>
        <Panel title="Demo data" subtitle="All records are fictional and generated locally in your browser.">
          <div className="demo-data-card"><div className="demo-data-mark"><Activity size={22} /></div><div><strong>{numberFormat.format(transactions.length)} sample transactions</strong><span>Fixed, deterministic dataset · Oct 2024 to Oct 2026</span></div><button className="quiet-button" onClick={resetDashboard} type="button"><RefreshCw size={15} />Reset dashboard</button></div>
          <p className="settings-footnote">Live data, account management, and saved preferences require a backend connection. This prototype does not connect to a real analytics provider.</p>
        </Panel>
      </div>
    )
  }

  return (
    <div className={`app-shell theme-${theme}`}>
      {mobileNavOpen && <button aria-label="Close navigation" className="mobile-backdrop" onClick={() => setMobileNavOpen(false)} type="button" />}
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand"><span className="brand-mark"><i /><i /><i /></span><span>PINJARI</span><span className="brand-edition">INSIGHTS</span><button className="sidebar-close icon-button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} type="button"><X size={18} /></button></div>
        <div className="workspace-switch"><div className="workspace-avatar">P</div><div className="workspace-label"><strong>Pinjari Workspace</strong><span>Revenue intelligence</span></div><ChevronDown size={15} /></div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">{navigation.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activePage === label ? 'active' : ''}`} onClick={() => { setActivePage(label); setMobileNavOpen(false) }} type="button"><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === 'Reports' && <span className="nav-new">3</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="sidebar-status"><span className="status-live" /><div><strong>Demo environment</strong><span>Data is simulated</span></div><MoreHorizontal size={16} /></div><button className="profile-row" onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')} type="button"><span className="profile-avatar">AP</span><span className="profile-copy"><strong>Aasif Pinjari</strong><span>Creator · UI/UX &amp; frontend</span></span><MoreHorizontal size={17} /></button></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)} type="button"><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{activePage}</strong></div></div>
          <div className="topbar-tools">
            <label className="global-search"><Search size={16} /><input aria-label="Search transaction ID or customer" placeholder="Search anything..." onChange={(event) => { setQuery(event.target.value); setPage(1) }} value={query} /><kbd><Command size={11} />K</kbd></label>
            <div className="topbar-divider" />
            <div className="menu-anchor"><button className={`date-trigger ${openMenu === 'date' ? 'control-active' : ''}`} onClick={() => setOpenMenu(openMenu === 'date' ? null : 'date')} type="button"><CalendarDays size={15} /><span>{rangeLabel}</span><ChevronDown size={14} /></button>{openMenu === 'date' && <div className="popover date-popover"><span className="popover-title">Reporting period</span>{rangeOptions.map((option) => <button className={`popover-option ${range === option.value ? 'chosen' : ''}`} key={option.value} onClick={() => { setRange(option.value); setPage(1); setOpenMenu(null) }} type="button"><span>{option.label}</span>{range === option.value && <Check size={15} />}</button>)}<div className="popover-date">{rangeDateText}</div></div>}</div>
            <button className="icon-button theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} type="button">{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
            <div className="menu-anchor"><button className={`icon-button notification-trigger ${openMenu === 'notifications' ? 'control-active' : ''}`} aria-label="Notifications" onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')} type="button"><Bell size={17} /><i /></button>{openMenu === 'notifications' && <div className="popover notification-popover"><span className="popover-title">Notifications <span className="unread-count">2 new</span></span><div className="notification-item"><span className="notice-dot lime-bg" /><div><strong>Revenue is trending up</strong><span>Net sales are higher than the previous period.</span><small>Today · Sample insight</small></div></div><div className="notification-item"><span className="notice-dot coral-bg" /><div><strong>Weekly report is ready</strong><span>Your demo workspace summary has been updated.</span><small>Yesterday · Simulated</small></div></div></div>}</div>
            <div className="menu-anchor profile-anchor"><button className="top-avatar" aria-label="Open profile menu" onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')} type="button">AP</button>{openMenu === 'profile' && <div className="popover profile-popover"><span className="profile-menu-name">Aasif Pinjari</span><span className="profile-menu-email">Creator · UI/UX &amp; frontend</span><button className="popover-option" onClick={() => { setActivePage('Settings'); setOpenMenu(null) }} type="button"><Settings size={15} />Workspace settings</button><button className="popover-option" onClick={() => notify('Pinjari Insights dashboard designed and built by Aasif Pinjari.')} type="button"><CircleQuestionIcon />About this demo</button></div>}</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-square" />PINJARI / INSIGHTS</div><h1>{title}<span className="heading-period">{rangeDateText}</span></h1><p>{subtitle}</p></div><div className="heading-actions"><label className="select-wrap"><SlidersHorizontal size={14} /><span className="sr-only">Filter by category</span><select aria-label="Filter by category" onChange={(event) => { setCategory(event.target.value); setPage(1) }} value={category}><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label><label className="select-wrap"><Globe2 size={14} /><span className="sr-only">Filter by region</span><select aria-label="Filter by region" onChange={(event) => { setRegion(event.target.value); setPage(1) }} value={region}><option>All regions</option>{regions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label><button className="icon-button reset-button" aria-label="Reset dashboard filters" title="Reset dashboard" onClick={resetDashboard} type="button"><RefreshCw size={16} /></button></div></div>
          <div className="demo-banner"><span className="demo-banner-icon"><Lightbulb size={15} /></span><span><strong>Sample data</strong> · Fictional transactions, customers, and performance metrics for demonstration.</span><button aria-label="Dismiss sample data note" onClick={(event) => event.currentTarget.parentElement?.remove()} type="button"><X size={14} /></button></div>
          {pageContent()}
          <footer className="page-footer"><span>PINJARI INSIGHTS <i /> DEMO ENVIRONMENT</span><span>© {copyrightYear} Aasif Pinjari · Design &amp; frontend</span></footer>
        </div>
      </main>
      {toast && <div className="toast" role="status"><span><Check size={15} /></span>{toast}</div>}
    </div>
  )
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const initials = transaction.customer.split(' ').map((part) => part[0]).join('').slice(0, 2)
  return (
    <tr>
      <td className="transaction-id">{transaction.id}</td>
      <td><span className="customer-cell"><i>{initials}</i>{transaction.customer}</span></td>
      <td>{formatDate(transaction.date, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</td>
      <td><span className="category-cell">{transaction.category}</span></td>
      <td>{transaction.region}</td>
      <td className="revenue-cell">{usd.format(transaction.revenue)}</td>
      <td><span className={`status-badge status-${transaction.status.toLowerCase()}`}><i />{transaction.status}</span></td>
    </tr>
  )
}

function InsightStrip({ region, source, average }: { region?: { name: string; value: number }; source?: { name: string; value: number }; average: number }) {
  return (
    <div className="insight-strip"><div className="insight-icon"><Lightbulb size={17} /></div><div className="insight-copy"><span>WORTH A LOOK <i>·</i> RULE-BASED INSIGHT</span><strong>{region ? `${region.name} leads regional sales` : 'Regional sales are taking shape'}{source ? `, while ${source.name.toLowerCase()} is your top discovery source.` : '.'}</strong></div><div className="insight-stat"><span>AVG. ORDER</span><strong>{usd.format(average)}</strong></div></div>
  )
}

function CircleQuestionIcon() {
  return <span className="question-mark" aria-hidden="true">?</span>
}
