import { getRouterParam, getQuery, createError } from 'h3';
import { $fetch } from 'ofetch';

export default defineCachedEventHandler(async (event) => {
  const cityParam = getRouterParam(event, 'city');
  if (!cityParam) {
    throw createError({ statusCode: 400, statusMessage: 'city is required' });
  }
 
  const city = decodeURIComponent(cityParam);
  const { units } = getQuery(event) as { units?: 'metric' | 'imperial' };
 
  // 1) Geocode city -> lat/lon
  const geo = await $fetch<{
    results?: Array<{
      name: string;
      country: string;
      latitude: number;
      longitude: number;
    }>;
  }>('https://geocoding-api.open-meteo.com/v1/search', {
    params: { name: city, count: 1, language: 'en', format: 'json' },
  });
 
  if (!geo?.results?.length) {
    throw createError({ statusCode: 404, statusMessage: 'city not found' });
  }
 
  const { name, country, latitude, longitude } = geo.results[0];
 
  // 2) Fetch current weather
  const forecastParams: Record<string, any> = {
    latitude,
    longitude,
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'wind_speed_10m',
    ].join(','),
    timezone: 'auto',
  };
 
  if (units === 'imperial') {
    forecastParams.temperature_unit = 'fahrenheit';
    forecastParams.wind_speed_unit = 'mph';
  }
 
  const forecast = await $fetch<{
    current: {
      time: string;
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      wind_speed_10m: number;
    };
  }>('https://api.open-meteo.com/v1/forecast', { params: forecastParams });
 
  return {
    city: name,
    country,
    latitude,
    longitude,
    units: units === 'imperial' ? 'imperial' : 'metric',
    current: forecast.current,
  };
}, {
  maxAge: 60, // Cache for 60 seconds 
  name: 'weatherByCity',
  getKey: (event) => {
    const cityParam = getRouterParam(event, 'city');
    const { units } = getQuery(event) as { units?: 'metric' | 'imperial' };
    const city = cityParam ? decodeURIComponent(cityParam) : 'unknown';
    const normalizedUnits = units === 'imperial' ? 'imperial' : 'metric';
    return `${city}-${normalizedUnits}`;
  },
  varies: ['units'], // Consider units query parameter for caching
  swr: true // Enable stale-while-revalidate behavior
});