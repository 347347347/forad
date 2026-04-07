export interface VerificationAxis {
  id: string
  label: string
  detail: string
  done: boolean
}

export interface Equipment {
  name: string
  isShared: boolean
}

export interface Product {
  no: string
  maker: string
  name: string
}

export interface DashboardData {
  title: string
  links: {
    eval: string
    manual: string
  }
  axes: VerificationAxis[]
  equipment: Equipment[]
  products: Product[]
  quantInputs: string[]
  funcInputs: string[]
}
