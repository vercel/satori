import { loadYoga } from 'yoga-layout/load';

// Always preload Yoga.
const loadingYoga = loadYoga();
const getYoga = () => {
	return loadingYoga;
};

export { getYoga };
