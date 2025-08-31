import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700 py-6 mt-auto">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center space-y-3">
          {/* Main text */}
          <div className="flex items-center space-x-2 text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Built with ❤️ by
            </span>
            <a 
              href="https://www.linkedin.com/in/naveenkumar-kalluri-3b7709224/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                window.open('https://www.linkedin.com/in/naveenkumar-kalluri-3b7709224/', '_blank', 'noopener,noreferrer');
              }}
              className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold transition-colors duration-200 group cursor-pointer"
            >
              <span>Naveenkumar Kalluri</span>
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
          
          {/* Copyright and year */}
          <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
            © {new Date().getFullYear()} Navinity. All rights reserved.
          </div>
          
          {/* Optional tech stack note */}
          <div className="text-xs text-gray-400 dark:text-gray-600 text-center opacity-75">
            Hey loves's ! Come let's make oppurtunities at one place💜
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
