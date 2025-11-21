// 1. DOM 요소 선택 및 전역 변수 설정
const cityInput = document.querySelector('#cityInput');
const searchBtn = document.querySelector('#searchBtn');
const currentLocationBtn = document.querySelector('#currentLocationBtn');
const recentSearchesContainer = document.querySelector('#recentSearches');
const errorDisplay = document.querySelector('#errorDisplay');
const currentWeatherSection = document.querySelector('#currentWeather');
const forecastSection = document.querySelector('#forecast');
const forecastContainer = document.querySelector('#forecastContainer');
const unitToggleBtn = document.querySelector('#unitToggleBtn');

// 상태 변수
let currentUnit = 'metric'; // 'metric' = 섭씨, 'imperial' = 화씨
let lastSearchedCity = '';
let recentCities = [];

// 2. 이벤트 리스너 등록
// 페이지 로드 시: localStorage에서 최근 검색어 불러오기
document.addEventListener('DOMContentLoaded', loadRecentSearches);

// 검색 버튼 클릭
searchBtn.addEventListener('click', handleSearch);

// 내 위치 찾기 버튼 클릭
currentLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    handleError("이 브라우저는 위치 정보를 지원하지 않습니다.");
    return;
  }
  navigator.geolocation.getCurrentPosition(success, error);
});

// Enter 키로 검색
cityInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    handleSearch();
  }
});

// 단위 변환 버튼 클릭
unitToggleBtn.addEventListener('click', toggleUnits);

// 입력창 클릭시 최근 검색어 보여주기
cityInput.addEventListener('click', () => {
  if (recentCities.length > 0) {
    recentSearchesContainer.classList.remove('hidden');
  }
});

// 화면의 아무 곳이나 클릭했을 때 -> 검색창 외부라면 목록 숨기기
document.addEventListener('click', (e) => {
  if (!document.querySelector('.search-box').contains(e.target)) {
    recentSearchesContainer.classList.add('hidden');
  }
});

// 3. 핵심 비즈니스 로직 (API 호출 - 보안 모드)
// 검색 처리 핸들러
function handleSearch() {
  const city = cityInput.value.trim();
  if (city) {
    getWeather(city);
    cityInput.value = ''; 
    recentSearchesContainer.classList.add('hidden'); 
  } else {
    handleError("도시 이름을 입력하세요.");
  }
}

/**
 * [보안 모드] 도시 이름으로 날씨 가져오기 (서버 경유)
 */
async function getWeather(city) {
  // UI 초기화
  handleError(); 
  currentWeatherSection.classList.remove('hidden');
  forecastSection.classList.remove('hidden');

  try {
    // 직접 호출하지 않고 /api/weather로 요청 ㅂ내기
    const response = await fetch(`/api/weather?city=${city}&units=${currentUnit}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "도시를 찾을 수 없습니다.");
    }

    // 성공 데이터 처리
    const prettyCityName = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
    lastSearchedCity = prettyCityName;
    
    displayWeather(data.current);
    displayForecast(data.forecast);
    saveRecentSearch(prettyCityName);

  } catch (error) {
    console.error(error);
    handleError(error.message);
  }
}

/**
 * [보안 모드] 좌표(위도, 경도)로 날씨 가져오기 (서버 경유)
 */
async function getWeatherByCoordinates(lat, lon) {
  handleError();
  currentWeatherSection.classList.remove('hidden');
  forecastSection.classList.remove('hidden');

  try {
    // 직접 호출하지 않고 /api/weather 로 요청을 보냅니다.
    const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}&units=${currentUnit}`);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "날씨 정보를 가져올 수 없습니다.");
    }

    // 좌표 검색일 때는 API가 주는 정확한 지역명을 사용합니다.
    lastSearchedCity = data.current.name; 
    
    displayWeather(data.current);
    displayForecast(data.forecast);
    saveRecentSearch(data.current.name);

  } catch (error) {
    console.error(error);
    handleError("날씨 정보를 가져오는 데 실패했습니다.");
  }
}

// 위치 파악 성공 콜백
function success(position) {
  const lat = position.coords.latitude;
  const lon = position.coords.longitude;
  getWeatherByCoordinates(lat, lon);
}

// 위치 파악 실패 콜백
function error() {
  handleError("위치 정보를 가져올 수 없습니다. 위치 권한을 허용해주세요.");
}

// 화면 표시
function displayWeather(data) { 
  const { name, main, weather, wind } = data;

  // 1. [날짜 표시]
  const now = new Date();
  const month = now.getMonth() + 1;
  const dayDate = now.getDate();
  const dayName = now.toLocaleDateString('ko-KR', { weekday: 'short' });
  const todayString = `${month}월 ${dayDate}일 (${dayName})`;

  const dateElement = document.querySelector('#currentDate');
  if (dateElement) {
      dateElement.textContent = todayString;
  }

  // 2. [도시 이름]
  const displayName = lastSearchedCity ? lastSearchedCity : name;
  document.querySelector('#cityName').textContent = displayName.charAt(0).toUpperCase() + displayName.slice(1);
  
  // 3. [아이콘 및 기본 정보]
  const iconUrl = getCustomIcon(weather[0].icon); 
  
  document.querySelector('#currentTemp').textContent = `${Math.round(main.temp)}°`;
  document.querySelector('#weatherIcon').src = iconUrl;
  document.querySelector('#weatherIcon').alt = weather[0].description;
  document.querySelector('#weatherDesc').textContent = weather[0].description;
  document.querySelector('#humidity').textContent = main.humidity;
  document.querySelector('#windSpeed').textContent = wind.speed;

  // 온도 단위 표시
  if (currentUnit === 'metric') {
    unitToggleBtn.textContent = '°F';
    document.querySelector('#windSpeed').nextSibling.textContent = ' m/s';
  } else {
    unitToggleBtn.textContent = '°C';
    document.querySelector('#windSpeed').nextSibling.textContent = ' mph';
  }

  // 옷차림 정보
  displayOutfitInfo(main.temp);
  // 배경 테마
  updateVisuals(weather[0].main);
}

function displayForecast(data) {
  forecastContainer.innerHTML = ''; 

  const dailyForecasts = data.list.filter(item => 
    item.dt_txt.includes("06:00:00")
  );

  dailyForecasts.forEach(day => {
    const date = new Date(day.dt * 1000);
    
    const month = date.getMonth() + 1;
    const dayDate = date.getDate();
    const dayName = date.toLocaleDateString('ko-KR', { weekday: 'short' });
    const formattedDate = `${month}/${dayDate}(${dayName})`;

    const iconUrl = getCustomIcon(day.weather[0].icon);

    const card = document.createElement('div');
    card.className = 'forecast-card';
    card.innerHTML = `
      <p style="font-weight: bold; margin-bottom: 5px;">${formattedDate}</p>
      <img src="${iconUrl}" alt="${day.weather[0].description}">
      <p class="temp">${Math.round(day.main.temp)}°</p>
    `;
    
    forecastContainer.appendChild(card);
  });
}

function displayRecentSearches() {
  recentSearchesContainer.innerHTML = ''; 
  
  if (recentCities.length > 0) {
    const title = document.createElement('div');
    title.textContent = '최근 검색어';
    title.style.cssText = 'font-size: 0.8rem; color: #888; margin: 5px 10px;';
    recentSearchesContainer.appendChild(title);
  }

  recentCities.forEach(city => {
    const btn = document.createElement('button');
    btn.textContent = city;
    btn.addEventListener('click', () => {
      getWeather(city);
      cityInput.value = '';
      recentSearchesContainer.classList.add('hidden'); 
    });
    recentSearchesContainer.appendChild(btn);
  });
}

// 5. 유틸리티 및 헬퍼 함수

function handleError(message = null) {
  if (message) {
    errorDisplay.textContent = message;
    errorDisplay.classList.remove('hidden');
    currentWeatherSection.classList.add('hidden');
    forecastSection.classList.add('hidden');
  } else {
    errorDisplay.textContent = '';
    errorDisplay.classList.add('hidden');
  }
}

function toggleUnits() {
  currentUnit = (currentUnit === 'metric') ? 'imperial' : 'metric';
  if (lastSearchedCity) {
    getWeather(lastSearchedCity);
  }
}

function saveRecentSearch(city) {
  recentCities = recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
  recentCities.unshift(city);
  
  if (recentCities.length > 5) {
    recentCities.pop();
  }
  
  localStorage.setItem('recentCities', JSON.stringify(recentCities));
  displayRecentSearches();
}

function loadRecentSearches() {
  const storedCities = localStorage.getItem('recentCities');
  if (storedCities) {
    recentCities = JSON.parse(storedCities);
    displayRecentSearches();
  }
}

function updateVisuals(weatherMain) {
  // 배경 변경 등 추가 기능을 구현할 수 있는 곳
}

function displayOutfitInfo(currentTemp) {
  const outfitTextElement = document.querySelector('#outfitText');
  if (!outfitTextElement) return;

  let tempInCelsius = currentTemp;
  if (currentUnit === 'imperial') {
      tempInCelsius = (currentTemp - 32) * 5 / 9;
  }

  const recommendation = getOutfitRecommendation(tempInCelsius);
  outfitTextElement.textContent = recommendation;
}

function getOutfitRecommendation(tempCelsius) {
  if (tempCelsius >= 28) return "무더운 날씨! 민소매, 반바지, 원피스를 추천해요.";
  if (tempCelsius >= 23) return "반팔, 얇은 셔츠, 반바지나 면바지가 좋겠어요.";
  if (tempCelsius >= 20) return "얇은 가디건이나 긴팔티, 청바지를 입으세요.";
  if (tempCelsius >= 17) return "얇은 니트, 맨투맨, 가디건으로 체온을 지키세요.";
  if (tempCelsius >= 12) return "자켓, 가디건, 야상에 청바지가 딱이에요.";
  if (tempCelsius >= 9)  return "쌀쌀해요. 트렌치코트나 점퍼를 걸치세요.";
  if (tempCelsius >= 5)  return "추워요! 코트, 가죽자켓에 히트텍을 입으면 좋겠네요.";
  return "이불 속에 쏘옥... ";
}

function getCustomIcon(iconCode) {
  const baseUrl = "https://basmilius.github.io/weather-icons/production/fill/all/";
  let iconName = "not-available";
  const isDay = iconCode.includes('d');

  switch (iconCode.slice(0, 2)) {
    case '01': iconName = isDay ? 'clear-day' : 'clear-night'; break;
    case '02': iconName = isDay ? 'partly-cloudy-day' : 'partly-cloudy-night'; break;
    case '03': iconName = 'cloudy'; break;
    case '04': iconName = 'overcast'; break;
    case '09': iconName = 'rain'; break;
    case '10': iconName = isDay ? 'partly-cloudy-day-rain' : 'partly-cloudy-night-rain'; break;
    case '11': iconName = 'thunderstorms'; break;
    case '13': iconName = 'snow'; break;
    case '50': iconName = 'mist'; break;
    default:   iconName = isDay ? 'clear-day' : 'clear-night';
  }
  return `${baseUrl}${iconName}.svg`;
}