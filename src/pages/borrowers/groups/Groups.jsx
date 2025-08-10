import React from 'react';
import { Link } from 'react-router-dom';

const BorrowerGroups = () => {
  // TODO: GET /borrowers/groups with pagination + filters
  const rows = [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Borrower Groups</h1>
        <Link to="/borrowers/groups/add" className="px-3 py-2 bg-blue-600 text-white rounded">Add Group</Link>
      </div>

      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Group Name</th>
              <th className="text-left p-2">Members</th>
              <th className="text-left p-2">Branch</th>
              <th className="text-left p-2">Loans</th>
              <th className="text-left p-2">Outstanding</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="p-4 text-gray-500" colSpan={6}>No groups yet.</td></tr>
            ) : rows.map((g) => (
              <tr key={g.id} className="border-t">
                <td className="p-2">{g.name}</td>
                <td className="p-2">{g.memberCount}</td>
                <td className="p-2">{g.branchName}</td>
                <td className="p-2">{g.loanCount}</td>
                <td className="p-2">TZS {Number(g.outstanding || 0).toLocaleString()}</td>
                <td className="p-2">
                  <Link to={`/borrowers/groups/${g.id}`} className="px-2 py-1 border rounded">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BorrowerGroups;
