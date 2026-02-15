import React, { useEffect, useState, useRef } from 'react';
import { RamadanTiming, Translation, AppSettings } from '../types';
import { sendNotification, playAlarm } from '../services/notificationService';
import { getTrueDate, getLocalDateString } from '../services/timeService';
import { formatTo12h } from '../App';
import { toUrduNumber } from '../utils';

interface CountdownProps {
  timings: RamadanTiming[];
  translation: Translation;
  settings: AppSettings;
}

const Countdown: React.FC<CountdownProps> = ({ timings, translation, settings }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [nextEventLabel, setNextEventLabel] = useState<string>('');
  const [activeTiming, setActiveTiming] = useState<RamadanTiming | null>(null);
  const [exactTime, setExactTime] = useState<string>('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateTime = () => {
      const now = getTrueDate();
      const todayStr = getLocalDateString();

      const todayTiming = timings.find(t => t.date === todayStr);
      let targetDate: Date | null = null;
      let label = '';
      let isSehri = false;

      if (todayTiming) {
        const sehriTime = new Date(`${todayStr}T${todayTiming.sehri}:00`);
        const iftarTime = new Date(`${todayStr}T${todayTiming.iftar}:00`);

        // Blinking logic: 5 minutes after event
        const fiveMinsAfterSehri = new Date(sehriTime.getTime() + 5 * 60 * 1000);
        const fiveMinsAfterIftar = new Date(iftarTime.getTime() + 5 * 60 * 1000);

        if (now >= sehriTime && now < fiveMinsAfterSehri) {
          setIsBlinking(true);
        } else if (now >= iftarTime && now < fiveMinsAfterIftar) {
          setIsBlinking(true);
        } else {
          setIsBlinking(false);
        }

        if (now < sehriTime) {
          targetDate = sehriTime;
          label = translation.sehri;
          isSehri = true;
          setActiveTiming(todayTiming);
          setExactTime(todayTiming.sehri);
        } else if (now < iftarTime) {
          targetDate = iftarTime;
          label = translation.iftar;
          isSehri = false;
          setActiveTiming(todayTiming);
          setExactTime(todayTiming.iftar);
        }
      }

      if (!targetDate) {
        const futureTimings = timings.filter(t => new Date(t.date) > now);
        if (futureTimings.length > 0) {
          const next = futureTimings[0];
          targetDate = new Date(`${next.date}T${next.sehri}:00`);
          label = `${translation.sehri} (${next.date})`;
          isSehri = true;
          setActiveTiming(next);
          setExactTime(next.sehri);
        } else {
          setNextEventLabel(translation.completed);
          setTimeLeft("00:00:00");
          return;
        }
      }

      setNextEventLabel(label);

      const diff = targetDate.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );

      if (settings.notificationsEnabled) {
        const totalMinutesLeft = Math.floor(diff / 60000);
        const secondsLeft = Math.floor((diff % 60000) / 1000);

        // Pre-Sehri Alert
        if (isSehri && settings.sehriAlertOffset > 0) {
          if (totalMinutesLeft === settings.sehriAlertOffset && secondsLeft === 0) {
            const msg = settings.sehriAlertOffset === 60 ? translation.sehriAlert1Hour : `${settings.sehriAlertOffset} ${translation.minutes} remaining for Sehri!`;
            sendNotification(translation.ramadanAlert, msg);
            playAlarm('beep');
          }
        }

        // Pre-Iftar Alert
        if (!isSehri && settings.iftarAlertOffset > 0) {
          if (totalMinutesLeft === settings.iftarAlertOffset && secondsLeft === 0) {
            const msg = settings.iftarAlertOffset === 20 ? translation.iftarAlert20Min : `${settings.iftarAlertOffset} ${translation.minutes} remaining for Iftar!`;
            sendNotification(translation.ramadanAlert, msg);
            playAlarm('beep');
          }
        }

        // Exact Time Alert
        if (hours === 0 && minutes === 0 && seconds === 0) {
          const msg = isSehri ? translation.sehriEnded : translation.iftarTime;
          sendNotification(translation.ramadanAlert, msg);
          playAlarm('alarm');
        }
      }
    };

    const timer = setInterval(calculateTime, 1000);
    calculateTime();
    return () => clearInterval(timer);
  }, [timings, translation, settings]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const scrollLeft = scrollContainerRef.current.scrollLeft;
      const width = scrollContainerRef.current.offsetWidth;
      const index = Math.round(scrollLeft / width);
      setActiveIndex(index);
    }
  };

  return (
    <div className={`relative mb-6 rounded-3xl shadow-xl overflow-hidden min-h-[220px] transition-all duration-500 ${isBlinking ? 'animate-event-blink' : 'bg-emerald-600'}`}>
      {/* Decorative Elements */}
      <div className="absolute -top-12 -left-12 w-40 h-40 bg-emerald-500 rounded-full opacity-50 blur-2xl"></div>
      <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-emerald-400 rounded-full opacity-30 blur-2xl"></div>

      {/* Swipeable Container */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth relative z-10"
      >
        {/* Slide 1: Countdown */}
        <div className="min-w-full snap-center flex flex-col items-center justify-center p-8 text-white text-center">
          <p className="text-emerald-100 text-[10px] font-bold tracking-widest mb-1 uppercase opacity-80">{translation.next}</p>
          <h2 className="text-xl font-bold mb-2">{nextEventLabel}</h2>
          <div className="text-6xl font-mono font-bold my-1 tracking-tighter tabular-nums drop-shadow-lg">
            {timeLeft}
          </div>
          <p className="text-[10px] text-emerald-100/60 mt-2 uppercase tracking-widest">{translation.timeLeft}</p>
        </div>

        {/* Slide 2: Target Time */}
        <div className="min-w-full snap-center flex flex-col items-center justify-center p-8 text-white text-center">
          <p className="text-emerald-100 text-[10px] font-bold tracking-widest mb-1 uppercase opacity-80">{translation.eventTimeLabel}</p>
          <h2 className="text-xl font-bold mb-2">{nextEventLabel}</h2>
          <div className="text-5xl font-mono font-bold my-1 tracking-tighter tabular-nums drop-shadow-lg">
            {formatTo12h(exactTime)}
          </div>
          <p className="text-[10px] text-emerald-100/60 mt-2 uppercase tracking-widest">12H FORMAT</p>
        </div>
      </div>

      {/* Hijri Info Overlay */}
      {activeTiming && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-3 z-20 text-emerald-100/90 text-[10px] bg-emerald-700/30 px-4 py-1 rounded-full backdrop-blur-sm border border-white/10">
          <span>
            {settings.language === 'ur'
              ? `رمضان ${toUrduNumber(activeTiming.hijri_date)}`
              : `Ramadan ${activeTiming.hijri_date}`}
          </span>
          <span>•</span>
          <span>{settings.language === 'ur' ? activeTiming.day_ur : activeTiming.day_en}</span>
        </div>
      )}

      {/* Pagination Dots */}
      <div className="absolute top-4 right-6 flex gap-1 z-20">
        <div className={`w-1.5 h-1.5 rounded-full transition-all ${activeIndex === 0 ? 'bg-white w-4' : 'bg-white/40'}`}></div>
        <div className={`w-1.5 h-1.5 rounded-full transition-all ${activeIndex === 1 ? 'bg-white w-4' : 'bg-white/40'}`}></div>
      </div>
    </div>
  );
};

export default Countdown;