import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import vdIcon from "../assets/vd.svg";
import cllIcon from "../assets/cll.svg";
import prsonIcon from "../assets/prson.svg";
import checkIcon from "../assets/checkk.svg";
import timeIcon from "../assets/time.svg";

function getMonthMatrix(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0-6
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const matrix = [];
  let day = 1 - firstDay;

  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      if (day < 1 || day > daysInMonth) {
        week.push(null);
      } else {
        week.push(day);
      }
      day++;
    }
    matrix.push(week);
  }
  return matrix;
}
const BookCounselling = () => {
  const { t } = useTranslation();
  const today = new Date();

  const [sessionType, setSessionType] = useState("video");
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState(null);

  const sessionTypes = [
    {
      id: "video",
      title: t("bookCounselling.videoCall"),
      desc: t("bookCounselling.videoCallDesc"),
      icon: vdIcon,
    },
    {
      id: "phone",
      title: t("bookCounselling.phoneCall"),
      desc: t("bookCounselling.phoneCallDesc"),
      icon: cllIcon,
    },
    {
      id: "inperson",
      title: t("bookCounselling.inPerson"),
      desc: t("bookCounselling.inPersonDesc"),
      icon: prsonIcon,
    },
  ];

  const timeSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
  ];

  const monthMatrix = getMonthMatrix(currentYear, currentMonth);
  const monthLabel = new Date(currentYear, currentMonth).toLocaleString(
    "default",
    {
      month: "long",
      year: "numeric",
    }
  );

  const changeMonth = (dir) => {
    setSelectedTime(null);
    if (dir === "prev") {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear((y) => y - 1);
      } else {
        setCurrentMonth((m) => m - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear((y) => y + 1);
      } else {
        setCurrentMonth((m) => m + 1);
      }
    }
  };

  // Slots earlier than now on today's date cannot be booked (the server
  // rejects them too), so do not offer them.
  const isPastSlot = (time) => {
    const [, hh, mm, ap] = time.match(/(\d+):(\d+)\s*(AM|PM)/i) || [];
    if (!hh) return false;
    const slot = new Date(selectedDate);
    slot.setHours((Number(hh) % 12) + (ap.toUpperCase() === "PM" ? 12 : 0), Number(mm), 0, 0);
    return slot <= new Date();
  };

  const isPastDate = (day) => {
    const d = new Date(currentYear, currentMonth, day);
    d.setHours(0, 0, 0, 0);
    const t = new Date(today);
    t.setHours(0, 0, 0, 0);
    return d < t;
  };

  return (
    <div className="min-h-[100svh] bg-[#fafafa] px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-[#0F1729]">
            {t("bookCounselling.pageTitle")}
          </h1>
          <p className="!text-base text-[#65758B] mt-1">
            {t("bookCounselling.pageSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Session Type */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-2xl text-[#0F1729] font-semibold">
                {t("bookCounselling.sessionType")}
              </h3>
              <p className="!text-sm text-[#65758B] mb-8 mt-1">
                {t("bookCounselling.sessionTypeSubtitle")}
              </p>

              <div className="space-y-3">
                {sessionTypes.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSessionType(item.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition ${
                      sessionType === item.id
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        sessionType === item.id
                          ? "border-teal-600"
                          : "border-slate-300"
                      }`}
                    >
                      {sessionType === item.id && (
                        <span className="w-2 h-2 rounded-full bg-teal-600" />
                      )}
                    </span>
                    <img src={item.icon} alt={item.title} className="w-6 h-6" />
                    <div className="flex-1 font-inter">
                      <p className="!text-sm !font-medium !text-[#0F1729]">{item.title}</p>
                      <p className="!text-sm !font-medium text-slate-500">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-2xl text-[#0F1729] font-semibold">
                {t("bookCounselling.selectDate")}
              </h3>
              <p className="!text-sm text-[#65758B] mb-8 mt-1">
                {t("bookCounselling.selectDateSubtitle")}
              </p>

              <div className="max-w-sm mx-auto border rounded-xl p-4">
                <div className="flex justify-between items-center mb-3">
                  <button
                    onClick={() => changeMonth("prev")}
                    className="w-8 h-8 rounded-full border-2 border-[#188B8B]"
                  >
                    ‹
                  </button>
                  <p className="!text-sm !text-[#0F1729] !font-medium">{monthLabel}</p>
                  <button
                    onClick={() => changeMonth("next")}
                    className="w-8 h-8 rounded-full border-2 border-[#188B8B]"
                  >
                    ›
                  </button>
                </div>

                <div className="grid grid-cols-7 text-xs text-center text-slate-500 mb-2">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-sm">
                  {monthMatrix.map((week, wi) =>
                    week.map((day, di) => {
                      if (!day) return <div key={`${wi}-${di}`} />;

                      const isSelected =
                        selectedDate.getDate() === day &&
                        selectedDate.getMonth() === currentMonth &&
                        selectedDate.getFullYear() === currentYear;

                      const disabled = isPastDate(day);

                      return (
                        <button
                          key={`${wi}-${di}`}
                          disabled={disabled}
                          onClick={() =>
                            setSelectedDate(
                              new Date(currentYear, currentMonth, day)
                            )
                          }
                          className={`h-8 rounded-md transition ${
                            disabled
                              ? "text-slate-300 cursor-not-allowed"
                              : isSelected
                              ? "bg-teal-600 text-white"
                              : "hover:bg-slate-100 text-slate-700"
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Time Slots */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-2xl text-[#0F1729] font-semibold">
                {t("bookCounselling.selectTimeSlot")}
              </h3>
              <p className="!text-sm text-[#65758B] mb-8 mt-1">
                {t("bookCounselling.availableSlotsFor", { date: selectedDate.toLocaleDateString() })}
              </p>

              <div className="flex flex-wrap gap-3">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    disabled={isPastSlot(time)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-[14px] border-2 text-sm transition font-inter disabled:cursor-not-allowed disabled:opacity-40 ${
                      selectedTime === time
                        ? "bg-teal-600 text-white border-teal-600"
                        : "border-teal-600 text-teal-700 hover:bg-teal-50"
                    }`}
                  >
                    <img
                      src={timeIcon}
                      alt="time"
                      className={`w-4 h-4 transition ${
                        selectedTime === time ? "filter brightness-0 invert" : ""
                      }`}
                    />
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Summary */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 h-fit">
            <h3 className="text-2xl text-[#0F1729] font-semibold">
              {t("bookCounselling.sessionDetails")}
            </h3>

            <div className="text-sm space-y-2 mt-2 mb-4 font-inter text-[#0F1729]">
              <div className="flex justify-between">
                <span>{t("bookCounselling.type")}</span>
                <span>{sessionType}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("bookCounselling.date")}</span>
                <span>{selectedDate.toDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("bookCounselling.time")}</span>
                <span>{selectedTime || t("bookCounselling.notSelected")}</span>
              </div>
            </div>

            <ul className="space-y-3 text-sm font-inter text-[#0F1729]">
              <li className="flex items-center gap-2">
                <img src={checkIcon} alt="" className="w-4 h-4" />
                <span>{t("bookCounselling.feature60Min")}</span>
              </li>
              <li className="flex items-center gap-2">
                <img src={checkIcon} alt="" className="w-4 h-4" />
                <span>{t("bookCounselling.featureExpert")}</span>
              </li>
              <li className="flex items-center gap-2">
                <img src={checkIcon} alt="" className="w-4 h-4" />
                <span>{t("bookCounselling.featureActionPlan")}</span>
              </li>
              <li className="flex items-center gap-2">
                <img src={checkIcon} alt="" className="w-4 h-4" />
                <span>{t("bookCounselling.featureFollowUp")}</span>
              </li>
            </ul>

            {/* Counselling fee is GST-INCLUSIVE (₹999 is the amount paid).
                The GST is back-calculated as already-included so the rows
                reconcile: base (₹847) + GST (₹152) = ₹999. No 18% is added
                on top. */}
            <div className="border-y border-[#E1E7EF] mt-4 py-4 text-sm space-y-2 font-inter">
              <div className="flex justify-between">
                <span className="text-sm text-[#65758B]">{t("bookCounselling.sessionFee")}</span>
                <span className="text-base text-[#0F1729] font-semibold">₹847</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span className="text-sm text-[#65758B]">{t("bookCounselling.gst")}</span>
                <span className="text-[#0F1729]">₹152</span>
              </div>
            </div>

            <div className="flex justify-between mt-4 font-inter">
              <span className="text-base text-[#0F1729] font-semibold">{t("bookCounselling.total")}</span>
              <span className="text-2xl text-[#157A7A] font-bold">₹999</span>
            </div>
            <p className="text-xs text-[#65758B] mt-1 font-inter">
              {t("bookCounselling.inclTaxes")}
            </p>

            <button
              disabled={!selectedTime || isPastSlot(selectedTime)}
              className={`w-full mt-6 font-semibold text-sm  py-3 font-inter rounded-[14px] transition ${
                selectedTime
                  ? "bg-[#F59F0A] hover:bg-amber-500 text-[#0F1729]"
                  : "bg-[#facf84] text-slate-400 cursor-not-allowed"
              }`}
            >
              {t("bookCounselling.confirmAndPay")}
            </button>

            <p className="!text-xs text-[#65758B] text-center mt-3">
              {t("bookCounselling.cancellationNotice")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCounselling;
