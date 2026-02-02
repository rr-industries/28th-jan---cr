"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Shield, Clock } from "lucide-react";

// Fix for default marker icons in Leaflet + Next.js
const DefaultIcon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

type SessionMarker = {
    id: string;
    latitude: number;
    longitude: number;
    country: string;
    city: string;
    user_id: string;
    risk_level: string;
    status: string;
    login_at: string;
    isp: string;
};

// Helper to center map
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

export default function SessionMap({ sessions }: { sessions: SessionMarker[] }) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return <div className="h-[500px] bg-muted animate-pulse rounded-[2rem]" />;

    const activeSessions = sessions.filter(s => s.status === 'active' && s.latitude && s.longitude);

    return (
        <div className="h-[600px] w-full rounded-[2rem] overflow-hidden border-2 relative shadow-inner bg-slate-100">
            <MapContainer
                center={[20, 0]}
                zoom={2}
                scrollWheelZoom={true}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
                />

                {activeSessions.map((session) => (
                    <Marker
                        key={session.id}
                        position={[session.latitude, session.longitude]}
                        icon={L.divIcon({
                            className: 'custom-div-icon',
                            html: `<div class="relative flex h-4 w-4">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${session.risk_level === 'high' ? 'bg-red-400' :
                                    session.risk_level === 'medium' ? 'bg-orange-400' : 'bg-green-400'
                                } opacity-75"></span>
                <span class="relative inline-flex rounded-full h-4 w-4 ${session.risk_level === 'high' ? 'bg-red-500' :
                                    session.risk_level === 'medium' ? 'bg-orange-500' : 'bg-green-500'
                                } border-2 border-white shadow-md"></span>
              </div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8],
                        })}
                    >
                        <Popup className="rounded-2xl">
                            <div className="p-1 space-y-3 min-w-[200px]">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className={
                                        session.risk_level === 'high' ? "bg-red-100 text-red-700" :
                                            session.risk_level === 'medium' ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                                    }>
                                        {session.risk_level.toUpperCase()} RISK
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground font-mono">{session.id.substring(0, 8)}</span>
                                </div>

                                <div>
                                    <h3 className="font-bold text-sm flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> {session.city}, {session.country}
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                                        <Globe className="h-3 w-3" /> {session.isp}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Login Time</span>
                                        <span className="text-[11px] font-medium">{format(new Date(session.login_at), "HH:mm:ss")}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase">User</span>
                                        <span className="text-[11px] font-medium font-mono">{session.user_id.substring(0, 8)}</span>
                                    </div>
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg border text-xs space-y-2">
                <h4 className="font-bold">Live Session Map</h4>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 ring-2 ring-green-100"></span>
                    <span>Low Risk Sessions</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500 ring-2 ring-orange-100 pulse"></span>
                    <span>Medium Risk Alerts</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500 ring-4 ring-red-100 animate-pulse"></span>
                    <span>High Risk Threats</span>
                </div>
                <div className="pt-1 text-[10px] text-muted-foreground border-t font-medium">
                    Monitoring {activeSessions.length} global sessions
                </div>
            </div>
        </div>
    );
}
