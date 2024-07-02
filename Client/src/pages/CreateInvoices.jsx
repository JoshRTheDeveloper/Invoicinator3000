import React, { useState, useEffect } from 'react';
import jwtDecode from 'jwt-decode';
import { useQuery, useMutation } from '@apollo/client';
import axios from 'axios';
import Sidebar from '../components/sidebar/sidebar';
import { GET_USER } from '../utils/queries';
import { CREATE_INVOICE } from '../utils/mutations';
import { addInvoiceToIndexedDB, getInvoicesFromIndexedDB, getUserData } from '../utils/indexedDB';
import './CreateInvoices.css';

const CreateInvoices = () => {
  // State variables for form inputs and user data
  const [userData, setUserData] = useState(null);
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [profilePicture, setProfilePicture] = useState('');

  // Client's invoice details state
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [invoiceDetails, setInvoiceDetails] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [paidStatus, setPaidStatus] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Fetch user ID from decoded JWT token
  const token = localStorage.getItem('authToken');
  const decodedToken = jwtDecode(token);
  const userId = decodedToken.data._id;

  // Fetch user data using Apollo useQuery hook
  const { loading, error, data } = useQuery(GET_USER, {
    variables: { userId: userId || '' },
  });
// blah
  // Apollo useMutation hook for creating invoices
  const [createInvoice] = useMutation(CREATE_INVOICE);

  // Effect to fetch user data from IndexedDB on component mount
  useEffect(() => {
    const fetchUserDataFromIndexedDB = async () => {
      const localUserData = await getUserData(); 
      if (localUserData) {
        const { email, streetAddress, city, state, zip, profilePicture, company } = localUserData;
        setEmail(email);
        setStreetAddress(streetAddress);
        setCity(city);
        setState(state);
        setZip(zip);
        setProfilePicture(profilePicture);
        
        let clientCompanyName = '';
        if (company) {
          clientCompanyName = company; 
        } else if (data.getUser.firstName) {
          clientCompanyName = data.getUser.firstName; 
        }
       
        setUserData(localUserData);
      }
    };
  
    fetchUserDataFromIndexedDB();
  }, [data]); // Depend on data to update when user data changes

  // Computed user name based on company and last name
  const name = `${userData?.company || ''} ${userData?.lastName || ''}`;

  // User object for displaying user information in the form
  const user = {
    email: email,
    name: name,
    streetAddress: streetAddress,
    city: city + (state ? `, ${state}` : '') + (zip ? ` ${zip}` : ''),
    profilePicture: profilePicture,
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
  
    const invoiceAmountFloat = parseFloat(invoiceAmount);
    const dueDateISO = new Date(dueDate).toISOString();
  
    const variables = {
      invoiceAmount: invoiceAmountFloat,
      paidStatus: paidStatus,
      invoiceNumber: invoiceNumber,
      companyName: user.name,
      companyStreetAddress: user.streetAddress,
      companyCityAddress: user.city,
      companyEmail: user.email,
      clientName: clientName,
      clientStreetAddress: clientAddress,
      clientCityAddress: clientCity,
      clientEmail: clientEmail,
      dueDate: dueDateISO,
      userID: userId,
      invoice_details: invoiceDetails,
      profilePicture: profilePicture,
    };
  
    try {
      // Check if the invoice with the same invoiceNumber exists in IndexedDB
      const existingInvoices = await getInvoicesFromIndexedDB();
      const invoiceExists = existingInvoices.some(inv => inv.invoiceNumber === invoiceNumber);
  
      if (invoiceExists) {
        alert(`Invoice with Invoice Number ${invoiceNumber} already exists in IndexedDB.`);
        return;
      }
  
      if (navigator.onLine) {
        // Send invoice to server using Apollo createInvoice mutation
        const response = await createInvoice({ variables });
        console.log('Invoice sent to server:', response.data);
  
        // Also send invoice details to server endpoint for additional processing
        await axios.post('/send-invoice', variables);
        console.log('Invoice details sent to server:', variables);
      } else {
        // Save invoice locally to IndexedDB when offline
        await addInvoiceToIndexedDB(variables);
        console.log('Invoice saved to IndexedDB:', variables);
        alert('Invoice saved locally. It will be sent when you are back online.');
      }
  
      // Clear form fields after successful submission
      setInvoiceAmount('');
      setPaidStatus(false);
      setInvoiceNumber('');
      setClientEmail('');
      setClientName('');
      setClientAddress('');
      setClientCity('');
      setInvoiceDetails('');
      setDueDate('');
    } catch (error) {
      console.error('Error creating or sending invoice:', error);
    }
  };
  

  // Effect to sync invoices with server when back online
  useEffect(() => {
    const syncInvoicesWithServer = async () => {
      if (navigator.onLine) {
        const localInvoices = await getInvoicesFromIndexedDB();

        for (const invoice of localInvoices) {
          try {
            // Use Apollo createInvoice mutation to sync local invoices
            await createInvoice({ variables: invoice });
            console.log('Invoice synced with server:', invoice);

            // Also send invoice details to server endpoint for additional processing
            await axios.post('/send-invoice', invoice);
            console.log('Invoice details sent to server:', invoice);
          } catch (error) {
            console.error('Error syncing invoice with server:', error);
          }
        }
      }
    };

    // Listen for online event to trigger synchronization
    window.addEventListener('online', syncInvoicesWithServer);

    return () => {
      window.removeEventListener('online', syncInvoicesWithServer);
    };
  }, [createInvoice]); // Depend on createInvoice to update when mutation changes

  return (
    <>
      <div className="app">
        <Sidebar />
        <div className="center-content">
          <div className="container center-content bg-app-grey" id="main-create-container">
            <form className="form" onSubmit={handleFormSubmit}>
              <div className='spacing'></div>
              <div className='heading-invoices'>
                <div className='heading-title'>
                  <h3 className='invoice-h3'>Create Invoice</h3>
                  <div className='back-link'>
                    <a href="/dashboard">← to Dashboard</a>
                  </div>
                </div>
              </div>
              <div className='line'></div>
              <div className='section1'>
                <div className='split'>
                  <div>
                    {profilePicture && <img src={profilePicture} className='profile-picture1' alt="Profile" />}
                  </div>
                </div>
                <div className='split2'>
                  <div className='input'>
                    <label className="label font-casmono" htmlFor="invoice-num">Invoice#:</label>
                    <input type="text" placeholder="1234ABCD" id="invoice-num" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} maxLength="8" required />
                  </div>
                  <div className='input'> 
                    <label className="label font-casmono" htmlFor="payment-due">Payment Due:</label>
                    <input type="date" id="payment-due" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
                  </div>
                  <div className='input'>
                    <label className="label font-casmono" htmlFor="amount-due">Amount Due:</label>
                    <input type="text" placeholder="$00.00" id="amount-due" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className='user-client'>
                <div id="invoice-user-container">
                  <label className="label font-casmono" htmlFor="user-email">User:</label>
                  <div>
                    <input type="email" placeholder="Your Email" id="user-email" value={user.email} readOnly />
                  </div>
                  <div>
                    <label className="label-item" htmlFor="company-name"></label>
                    <input type="text" placeholder="Your Name/Company" id="company-name" value={user.name} readOnly />
                  </div>
                  <div>
                    <label className="label-item" htmlFor="user-address"></label>
                    <input type="text" placeholder="Address" id="user-address" value={user.streetAddress} readOnly />
                  </div>
                  <div>
                    <label className="label-item" htmlFor="user-city"></label>
                    <input type="text" placeholder="City, State, Zip" id="user-city" value={user.city} readOnly />
                  </div>
                </div>
                <div id="invoice-client-container">
                  <label className="label font-casmono" htmlFor="client-email">Client:</label>
                  <div>
                    <input type="email" placeholder="Client Email" id="client-email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label-item-right" htmlFor="client-name"></label>
                    <input type="text" placeholder="Client Name/Company" id="client-name" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label-item-right" htmlFor="client-address"></label>
                    <input type="text" placeholder="Billing Address" id="client-address" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label-item-right" htmlFor="client-city"></label>
                    <input type="text" placeholder="City, State, Zip" id="client-city" value={clientCity} onChange={(e) => setClientCity(e.target.value)} required />
                  </div>
                </div>
              </div>
              <div className="invoice-bottom">
                <label className="label-item font-casmono" htmlFor="invoice-details">Invoice&nbsp; Details:</label>
                <div id="details-container">
                  <textarea className='details' type="text" placeholder="Details of work provided" id="invoice-details" value={invoiceDetails} onChange={(e) => setInvoiceDetails(e.target.value)}></textarea>
                </div>
                <div className='invoice-button'>
                  <button type="submit" id="send-invoice-button">Send Invoice</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateInvoices;
