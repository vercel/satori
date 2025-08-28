import { loadYoga } from 'yoga-layout/load'

// Always preload Yoga.
const loadingYoga = loadYoga()
export function getYoga() {
  return loadingYoga
}
