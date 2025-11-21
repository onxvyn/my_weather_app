export default async function handler(request, response) {
  // Set API KEY
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  // Local Test
  // const apiKey = "eb9f8ea45cdd0ba91d8f0dfa42f2621b"; 

  // 2. 클라이언트에서 보낸 요청 파라미터 받기 (도시이름 or 위도/경도)
  const { city, lat, lon, units } = request.query;

  // 3. 요청 타입에 따라 API URL 생성
  let weatherQuery = '';
  
  if (city) {
    // 도시 이름으로 검색
    weatherQuery = `q=${city}`;
  } else if (lat && lon) {
    // 좌표(위도, 경도)로 검색
    weatherQuery = `lat=${lat}&lon=${lon}`;
  } else {
    // 둘 다 없으면 에러 반환
    return response.status(400).json({ error: 'City name or coordinates are required' });
  }

  // 공통 URL 파라미터
  const commonParams = `&appid=${apiKey}&units=${units || 'metric'}&lang=kr`;

  const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?${weatherQuery}${commonParams}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?${weatherQuery}${commonParams}`;

  try {
    // 4. 두 API 동시 호출
    const [currentWeatherResponse, forecastResponse] = await Promise.all([
      fetch(currentWeatherUrl),
      fetch(forecastUrl)
    ]);

    // 5. 에러 체크
    if (!currentWeatherResponse.ok) {
      const errorData = await currentWeatherResponse.json();
      throw new Error(`Weather API Error: ${errorData.message}`);
    }
    if (!forecastResponse.ok) {
      const errorData = await forecastResponse.json();
      throw new Error(`Forecast API Error: ${errorData.message}`);
    }

    // 6. 데이터 파싱
    const currentData = await currentWeatherResponse.json();
    const forecastData = await forecastResponse.json();

    // 7. 결과 반환
    response.status(200).json({
      current: currentData,
      forecast: forecastData
    });

  } catch (error) {
    console.error("Server Error:", error);
    response.status(500).json({
      error: error.message || 'Failed to fetch weather data'
    });
  }
}