import React from 'react';
import { useParams } from 'react-router-dom';

const GroupDetails = () => {
  const { groupId } = useParams();
  // TODO: GET /borrowers/groups/:groupId
  // sections: members, loans, meetings/attendance, repayments, notes

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Group #{groupId}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-semibold mb-2">Overview</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li><b>Name:</b> —</li>
            <li><b>Branch:</b> —</li>
            <li><b>Officer:</b> —</li>
            <li><b>Meeting Day:</b> —</li>
          </ul>
        </div>

        <div className="bg-white rounded shadow p-4 lg:col-span-2">
          <h3 className="font-semibold mb-2">Members</h3>
          <div className="text-sm text-gray-600">TODO: list with roles (chair/secretary/treasurer) + add/remove</div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Loans & Repayments</h3>
        <div className="text-sm text-gray-600">TODO: group loans, outstanding, next repayments, PAR</div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h3 className="font-semibold mb-2">Meetings & Attendance</h3>
        <div className="text-sm text-gray-600">TODO: schedule, attendance register, minutes</div>
      </div>
    </div>
  );
};

export default GroupDetails;
