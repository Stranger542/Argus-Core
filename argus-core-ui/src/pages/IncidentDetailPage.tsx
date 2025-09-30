import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getIncidentById } from '../services/api';

const IncidentDetailPage: React.FC = () => {
	const { id } = useParams();
	const [incident, setIncident] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const fetchIncident = async () => {
			try {
				const response = await getIncidentById(Number(id));
				setIncident(response.data);
			} catch (err: any) {
				setError(err.response?.data?.detail || 'Failed to fetch incident details.');
			} finally {
				setLoading(false);
			}
		};
		fetchIncident();
	}, [id]);

	if (loading) return <div className="p-8">Loading incident details...</div>;
	if (error) return <div className="p-8 text-red-500">{error}</div>;
	if (!incident) return <div className="p-8">No incident found.</div>;

	return (
		<div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl mx-auto mt-8">
			<h1 className="text-3xl font-bold mb-4 text-teal-300">Incident Detail</h1>
			<div className="mb-2"><span className="font-semibold">ID:</span> {incident.id}</div>
			<div className="mb-2"><span className="font-semibold">Camera ID:</span> {incident.camera_id}</div>
			<div className="mb-2"><span className="font-semibold">Event Type:</span> {incident.event_type}</div>
			<div className="mb-2"><span className="font-semibold">Score:</span> {incident.score ?? 'N/A'}</div>
			<div className="mb-2"><span className="font-semibold">Started At:</span> {incident.started_at}</div>
			<div className="mb-2"><span className="font-semibold">Status:</span> {incident.status}</div>
			<div className="mb-4"><span className="font-semibold">Clips:</span>
				<ul className="list-disc ml-6">
					{incident.clips && incident.clips.length > 0 ? (
						incident.clips.map((clip: any) => (
							<li key={clip.id}>
								<a href={clip.file_path} target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
									Clip #{clip.id}
								</a>
							</li>
						))
					) : (
						<li>No clips available.</li>
					)}
				</ul>
			</div>
		</div>
	);
};

export default IncidentDetailPage;
