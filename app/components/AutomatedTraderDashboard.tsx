import Sidebar from './Sidebar';
import StatusCard from './StatusCard';
import Pipeline from './Pipeline';
import SignalTable from './SignalTable';
import ActivityFeed from './ActivityFeed';
export default function AutomatedTraderDashboard(){return <main className="shell"><Sidebar/><div className="content"><header><div><p className="eyebrow">VAULTTRADES AUTOMATED TRADER</p><h1>Execution Control Center</h1><p className="muted">Automated market scanning, signal validation and execution.</p></div><div className="live">● LIVE ARCHITECTURE</div></header><StatusCard/><Pipeline/><SignalTable/><ActivityFeed/></div></main>}
