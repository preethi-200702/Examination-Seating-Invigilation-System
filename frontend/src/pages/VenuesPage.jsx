import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { Building2, Plus, Search, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

export const VenuesPage = () => {
  const { success, error } = useToast();

  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [availFilter, setAvailFilter] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    venueName: '',
    roomNumber: '',
    capacity: 30,
    floor: '1st Floor',
    availability: true,
  });

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const data = await api.getVenues({
        search: searchTerm,
        availability: availFilter,
      });
      if (data.success) {
        setVenues(data.venues || []);
      }
    } catch (err) {
      error(err.message || 'Failed to fetch venues.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, [searchTerm, availFilter]);

  const handleOpenAddModal = () => {
    setEditingVenue(null);
    setFormData({
      venueName: '',
      roomNumber: '',
      capacity: 30,
      floor: '1st Floor',
      availability: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (venue) => {
    setEditingVenue(venue);
    setFormData({
      venueName: venue.venueName,
      roomNumber: venue.roomNumber,
      capacity: venue.capacity,
      floor: venue.floor || 'Ground Floor',
      availability: venue.availability,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.venueName.trim() || !formData.roomNumber.trim()) {
      error('Please provide Venue Name and Room Number.');
      return;
    }

    if (Number(formData.capacity) <= 0) {
      error('Venue capacity must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingVenue) {
        const res = await api.updateVenue(editingVenue._id, formData);
        success(res.message || 'Venue updated successfully.');
      } else {
        const res = await api.createVenue(formData);
        success(res.message || 'Venue added successfully.');
      }
      setIsModalOpen(false);
      fetchVenues();
    } catch (err) {
      error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (venue) => {
    try {
      const res = await api.updateVenue(venue._id, {
        availability: !venue.availability,
      });
      success(`Venue status set to ${!venue.availability ? 'Active / Available' : 'Inactive'}.`);
      fetchVenues();
    } catch (err) {
      error(err.message || 'Failed to update venue status.');
    }
  };

  const handleDeleteVenue = async (venue) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete venue "${venue.venueName}" (${venue.roomNumber})?`
    );
    if (!confirmDelete) return;

    try {
      const res = await api.deleteVenue(venue._id);
      success(res.message || 'Venue deleted successfully.');
      fetchVenues();
    } catch (err) {
      error(err.message || 'Venue could not be deleted.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Venue & Examination Hall Management</h1>
          <p className="page-subtitle">Configure examination halls, seat capacities, and availability.</p>
        </div>
        <button onClick={handleOpenAddModal} className="btn btn-primary">
          <Plus size={18} />
          <span>Add New Venue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input
            type="text"
            className="search-input"
            placeholder="Search by venue name, room number, or floor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="select-filter"
          value={availFilter}
          onChange={(e) => setAvailFilter(e.target.value)}
        >
          <option value="">All Venues</option>
          <option value="true">Active / Available</option>
          <option value="false">Inactive / Maintenance</option>
        </select>

        {(searchTerm || availFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setAvailFilter('');
            }}
            className="btn btn-secondary btn-sm"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Venues Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading examination venues...
          </div>
        ) : venues.length === 0 ? (
          <div className="empty-state">
            <Building2 size={36} />
            <p>No venues found matching your criteria.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Room Number</th>
                <th>Venue / Hall Name</th>
                <th>Floor Location</th>
                <th>Seat Capacity</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v._id}>
                  <td>
                    <strong>{v.roomNumber}</strong>
                  </td>
                  <td>{v.venueName}</td>
                  <td>{v.floor || 'Ground Floor'}</td>
                  <td>
                    <span className="badge badge-primary">{v.capacity} Seats</span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleAvailability(v)}
                      className={`badge ${v.availability ? 'badge-success' : 'badge-danger'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      title="Click to toggle availability"
                    >
                      {v.availability ? (
                        <>
                          <CheckCircle size={12} /> Active
                        </>
                      ) : (
                        <>
                          <XCircle size={12} /> Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => handleOpenEditModal(v)}
                        className="btn btn-secondary btn-sm"
                        title="Edit venue"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteVenue(v)}
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger)' }}
                        title="Delete venue"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for Add / Edit Venue */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVenue ? 'Edit Venue Details' : 'Add New Examination Venue'}
      >
        <form onSubmit={handleFormSubmit}>
          <div className="form-group">
            <label className="form-label">Venue / Hall Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Main Block - Lecture Hall 1"
              value={formData.venueName}
              onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Room Number * (Unique)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. LH-101"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Seat Capacity * (&gt; 0)</label>
              <input
                type="number"
                min="1"
                className="form-control"
                placeholder="e.g. 30"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Floor / Location</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 1st Floor"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Availability Status</label>
              <select
                className="form-control"
                value={formData.availability}
                onChange={(e) =>
                  setFormData({ ...formData, availability: e.target.value === 'true' })
                }
              >
                <option value="true">Active / Available</option>
                <option value="false">Inactive / Maintenance</option>
              </select>
            </div>
          </div>

          <div className="modal-footer" style={{ margin: '20px -24px -24px -24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingVenue ? 'Update Venue' : 'Add Venue'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
