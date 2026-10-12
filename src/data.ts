export type PaymentStatus = 'Paid' | 'Pending' | 'Refunded'
export type TrafficSource = 'Direct' | 'Organic search' | 'Social' | 'Referral' | 'Paid campaigns'

export interface Transaction {
  id: string
  customer: string
  date: string
  category: string
  product: string
  region: string
  revenue: number
  status: PaymentStatus
  source: TrafficSource
  returning: boolean
}

export interface TrendPoint {
  label: string
  date: string
  revenue: number
  orders: number
  newCustomers: number
  returningCustomers: number
}

export const categories = [
  'Electronics',
  'Home & Living',
  'Wellness',
  'Outdoor',
  'Accessories',
  'Stationery',
] as const

export const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa'] as const
export const paymentStatuses: PaymentStatus[] = ['Paid', 'Pending', 'Refunded']
export const trafficSources: TrafficSource[] = ['Direct', 'Organic search', 'Social', 'Referral', 'Paid campaigns']

const productsByCategory: Record<(typeof categories)[number], string[]> = {
  Electronics: ['Studio headphones', 'Desk lamp', 'Wireless speaker', 'Mechanical keyboard'],
  'Home & Living': ['Linen throw', 'Ceramic set', 'Oak side table', 'Wool rug'],
  Wellness: ['Daily journal', 'Recovery kit', 'Sleep mask', 'Aroma diffuser'],
  Outdoor: ['Trail pack', 'Insulated bottle', 'Field blanket', 'Portable lantern'],
  Accessories: ['Leather folio', 'Canvas tote', 'Travel pouch', 'Everyday cap'],
  Stationery: ['Paper planner', 'Writing set', 'Sketchbook', 'Desk calendar'],
}

const firstNames = ['Maya', 'Noah', 'Leila', 'Theo', 'Ava', 'Elias', 'Nina', 'Omar', 'Sofia', 'Kai', 'Iris', 'Leo', 'Amara', 'Samira', 'Hugo', 'Zara', 'Mateo', 'Freya', 'Arjun', 'Elena', 'Mina', 'Ravi', 'Ada', 'Jonah']
const lastNames = ['Patel', 'Bennett', 'Hassan', 'Martin', 'Chen', 'Rivera', 'Kowalski', 'Farouk', 'Andersson', 'Williams', 'Nakamura', 'Fischer', 'Okafor', 'Ali', 'Moreau', 'Thompson', 'Silva', 'Lind', 'Mehta', 'Petrova', 'Kim', 'Brooks', 'Dubois', 'Reed']
const customers = firstNames.flatMap((firstName) => lastNames.map((lastName) => `${firstName} ${lastName}`))

const regionsList = [...regions]
const sourceList = [...trafficSources]
const statuses: PaymentStatus[] = ['Paid', 'Paid', 'Paid', 'Paid', 'Pending', 'Refunded']

function sampleTransactions(): Transaction[] {
  const records: Transaction[] = []
  const endDate = new Date('2026-10-12T12:00:00.000Z')
  let orderIndex = 0

  for (let day = 729; day >= 0; day -= 1) {
    const date = new Date(endDate)
    date.setUTCDate(date.getUTCDate() - day)
    const dateString = date.toISOString().slice(0, 10)

    const dailyOrders = 2 + ((day * 7 + Math.floor(day / 3)) % 5)
    for (let slot = 0; slot < dailyOrders; slot += 1) {
      const index = orderIndex
      const category = categories[(index * 7 + Math.floor(index / 9)) % categories.length]
      const products = productsByCategory[category]
      const revenue = 48 + ((index * 83 + Math.floor(index / 5) * 37) % 1450)

      records.push({
        id: `NX-${String(10400 + index)}`,
        customer: customers[Math.floor(index * 0.72) % customers.length],
        date: dateString,
        category,
        product: products[(index * 3 + Math.floor(index / 8)) % products.length],
        region: regionsList[(index * 5 + Math.floor(index / 12)) % regionsList.length],
        revenue,
        status: statuses[(index * 5 + Math.floor(index / 3)) % statuses.length],
        source: sourceList[(index * 3 + Math.floor(index / 7)) % sourceList.length],
        returning: index > 0 && Math.floor((index - 1) * 0.72) === Math.floor(index * 0.72),
      })
      orderIndex += 1
    }
  }

  return records
}

export const transactions = sampleTransactions()
