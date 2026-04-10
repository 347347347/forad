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
  isAbsent: boolean
  maker: string
  name: string
  kintoneStatus?: string
}

export interface InputItem {
  label: string
  done: boolean
}

export interface ProductProgress {
  productNo: string
  items: InputItem[]
  allNA: boolean
}

export interface DashboardData {
  title: string
  links: {
    eval: string | null
    manual: string | null
  }
  axes: VerificationAxis[]
  equipment: Equipment[]
  products: Product[]
  quantProgress: ProductProgress[]
  funcProgress: ProductProgress[]
  errors: string[]
}
