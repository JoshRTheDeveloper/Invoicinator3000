
import React, { useState, useEffect } from 'react';
import './dashboard.css';
import { useQuery, useMutation } from '@apollo/client';
import Sidebar from '../components/sidebar/sidebar';
import jwtDecode from 'jwt-decode';
import { GET_USER } from '../utils/queries';
import { UPDATE_INVOICE, DELETE_INVOICE } from '../utils/mutations';
import InvoiceModal from '../components/invoice-modal/invoice-modal';
import {
  getInvoicesFromIndexedDB,
  deleteInvoiceFromIndexedDB,
  updateInvoiceInIndexedDB,
  storeUserData 
} from '../utils/indexedDB'; 

const Home = () => {
  const token = localStorage.getItem('authToken');
  const decodedToken = jwtDecode(token);
  const userId = decodedToken.data._id;

  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInvoiceNumber, setSearchInvoiceNumber] = useState('');
  const [searchResult, setSearchResult] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const { refetch, loading: queryLoading } = useQuery(GET_USER, {
    variables: { userId: userId || '' },
    fetchPolicy: 'cache-first',
    onCompleted: async (data) => {
      console.log('Query completed', data);
      setUserData(data.getUser);
      setLoading(false);
      await Promise.all(data.getUser.invoices.map(invoice => addInvoiceToIndexedDB(invoice)));
    },
    onError: (error) => {
      console.error('Error fetching user data:', error);
      setLoading(false);
    },
    skip: isOffline,
  });

  const [markAsPaidMutation] = useMutation(UPDATE_INVOICE);
  const [deleteInvoiceMutation] = useMutation(DELETE_INVOICE);


  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const invoices = await getInvoicesFromIndexedDB();
        console.log('Fetched Invoices:', invoices);
  
        const invoicesWithUndefinedId = invoices.filter(invoice => !invoice._id);
        if (invoicesWithUndefinedId.length > 0) {
          console.warn('Invoices with undefined _id:', invoicesWithUndefinedId);
        }
  
        setUserData({ invoices });
  
        invoices.forEach(invoice => {
          console.log('Invoice ID:', invoice._id);
        });
      } catch (error) {
        console.error('Error fetching invoices from IndexedDB:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchInvoices(); 
  }, []);

  const handleSearch = () => {
    try {
      setSearchLoading(true);
      setSearchError(null);
      const filteredInvoices = userData?.invoices.filter(
        invoice => invoice.invoiceNumber.includes(searchInvoiceNumber)
      ) || [];

      setSearchResult(filteredInvoices);
    } catch (error) {
      setSearchError(error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleInvoiceClick = (invoice) => {
    setSelectedInvoice(invoice);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedInvoice(null);
    setIsModalOpen(false);
  };

  const handleDeleteInvoice = async (_id) => {
    console.log('Deleting invoice with _id:', _id);
    try {
      // Delete invoice from the server
      const { data } = await deleteInvoiceMutation({
        variables: { invoiceId: _id },
      });

      // Handle successful deletion response from server
      console.log('Deleted invoice from server:', data);

      // Delete invoice from IndexedDB
      await deleteInvoiceFromIndexedDB(_id);

      // Update local state
      setUserData(prevData => ({
        ...prevData,
        invoices: prevData.invoices.filter(invoice => invoice._id !== _id),
      }));

      console.log(`Invoice with _id ${_id} deleted successfully.`);
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };
  
  

  const handleUpdatePaidStatus = async (invoiceId, paidStatus) => {
    try {
      console.log(`Updating invoiceId: ${invoiceId} with paidStatus: ${paidStatus}`);

      if (!invoiceId) {
        console.error('invoiceId is undefined or falsy.');
        return;
      }

      await updateInvoiceInIndexedDB(invoiceId, paidStatus);

      setUserData(prevData => ({
        ...prevData,
        invoices: prevData.invoices.map(invoice =>
          invoice.id === invoiceId ? { ...invoice, paidStatus } : invoice
        )
      }));
    } catch (error) {
      console.error('Error updating invoice paid status:', error);
    }
  };

  useEffect(() => {
    console.log('userData changed:', userData);
  }, [userData]);

  if (loading) {
    return <p>Loading user data...</p>;
  }

  if (!userData) {
    return <p>No user data available.</p>;
  }

  const invoicesDue = userData?.invoices.filter(invoice => !invoice.paidStatus) || [];
  const invoicesPaid = userData?.invoices.filter(invoice => invoice.paidStatus) || [];
  const filteredInvoicesDue = searchInvoiceNumber
    ? invoicesDue.filter(invoice => invoice.invoiceNumber.includes(searchInvoiceNumber))
    : invoicesDue;


  return (
    <>
      <div className="app">
        <Sidebar />
        <div className="main-content">
          <div className='search-bar-div'>
            <h2>Search Invoices</h2>
            <input
              className='search-bar-input'
              type="text"
              value={searchInvoiceNumber}
              onChange={(e) => setSearchInvoiceNumber(e.target.value)}
              placeholder="Search by Invoice Number"
            />
            <div className='search-button-div'>
              <button onClick={handleSearch}>Search</button>
            </div>
          </div>

          {searchLoading ? (
            <p>Loading search results...</p>
          ) : searchError ? (
            <p>Error: {searchError.message}</p>
          ) : searchResult.length === 0 ? (
            <p>No results found.</p>
          ) : (
            <div className='search-results'>
              <h3>Search Results</h3>
              <ul>
                {searchResult.map(invoice => (
                  <li key={invoice._id} onClick={() => handleInvoiceClick(invoice)}>
                    <div className='due-date-container'>
                      <p className='invoice-number'>Invoice Number: {invoice.invoiceNumber}</p>
                      <p className='due-date'> Due Date: {new Date(parseInt(invoice.dueDate)).toLocaleDateString()} </p>
                    </div>
                    <div className='invoice-info'>
                      <p>Client: {invoice.clientName}</p>
                      <p>Amount: ${parseFloat(invoice.invoiceAmount.toString()).toFixed(2)}</p>
                      <p>Paid Status: {invoice.paidStatus ? 'Paid' : 'Not Paid'}</p>
                    </div>
                    <div className='mark-button'>
                      <button onClick={() => handleInvoiceClick(invoice)}>Info</button>
                      {!invoice.paidStatus && (
                        <button onClick={(e) => { e.stopPropagation(); handleUpdatePaidStatus(invoice._id, true); }}>Mark as Paid</button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(invoice._id); }}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="total">
            <div className="row">
              <h2>Invoices Due</h2>
              {filteredInvoicesDue.length === 0 ? (
                <p>No invoices due.</p>
              ) : (
                <ul>
                  {filteredInvoicesDue.map(invoice => (
                    <li key={invoice._id} onClick={() => handleInvoiceClick(invoice)}>
                      <div className='due-date-container'>
                        <p className='invoice-number'>Invoice Number: {invoice.invoiceNumber}</p>
                        <p className='due-date'> Due Date: {new Date(parseInt(invoice.dueDate)).toLocaleDateString()} </p>
                      </div>
                      <div className='invoice-info'>
                        <p>Client: {invoice.clientName}</p>
                        <p>Amount: ${parseFloat(invoice.invoiceAmount.toString()).toFixed(2)}</p>
                        <p>Paid Status: {invoice.paidStatus ? 'Paid' : 'Not Paid'}</p>
                      </div>
                      <div className='mark-button'>
                        <button onClick={() => handleInvoiceClick(invoice)}>Info</button>
                        {!invoice.paidStatus && (
                          <button onClick={(e) => { e.stopPropagation(); handleUpdatePaidStatus(invoice._id, true); }}>Mark as Paid</button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(invoice._id); }}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="row">
              <h2>Invoices Paid</h2>
              {invoicesPaid.length === 0 ? (
                <p>No paid invoices.</p>
              ) : (
                <ul>
                  {invoicesPaid.map(invoice => (
                    <li key={invoice._id} onClick={() => handleInvoiceClick(invoice)}>
                      <div className='due-date-container'>
                        <p className='invoice-number'>Invoice Number: {invoice.invoiceNumber}</p>
                        <p className='due-date'> Due Date: {new Date(parseInt(invoice.dueDate)).toLocaleDateString()} </p>
                      </div>
                      <div className='invoice-info'>
                        <p>Client: {invoice.clientName}</p>
                        <p>Amount: ${parseFloat(invoice.invoiceAmount.toString()).toFixed(2)}</p>
                        <p>Paid Status: {invoice.paidStatus ? 'Paid' : 'Not Paid'}</p>
                      </div>
                      <div className='mark-button'>
                        <button onClick={() => handleInvoiceClick(invoice)}>Info</button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteInvoice(invoice._id); }}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={closeModal}
          onSave={(updatedInvoice) => {
            setSearchResult(prevSearchResult =>
              prevSearchResult.map(invoice =>
                invoice._id === updatedInvoice._id ? updatedInvoice : invoice
              )
            );
          }}
        />
      )}
    </>
  );
};

export default Home;
