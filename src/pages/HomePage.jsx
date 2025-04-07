import { Link } from 'react-router-dom';

function HomePage() {
  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      <Link to="/about">
        <button>Go to About Page</button>
      </Link>
    </div>
  );
}

export default HomePage;