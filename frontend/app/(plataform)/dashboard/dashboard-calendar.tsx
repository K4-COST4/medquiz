"use client"

import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";

interface DashboardCalendarProps {
    activityDates: string[];
}

export function DashboardCalendar({ activityDates }: DashboardCalendarProps) {
    return (
        <div className="p-2 [&_.rdp-day]:pointer-events-none [&_.rdp-day_selected]:bg-indigo-600 [&_.rdp-day_selected]:text-white [&_.rdp-day_selected]:hover:bg-indigo-600 [&_.rdp-day_selected]:opacity-100">
            <Calendar
                mode="multiple"
                selected={activityDates.map(dateStr => new Date(dateStr + 'T12:00:00'))}
                className="rounded-md border-none shadow-none"
                locale={ptBR}
                classNames={{
                    day_selected: "bg-indigo-600 text-white hover:bg-indigo-600 focus:bg-indigo-600 opacity-100",
                    day_today: "bg-slate-100 text-slate-900 font-bold",
                }}
            />
        </div>
    );
}
