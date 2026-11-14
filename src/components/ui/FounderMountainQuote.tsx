import React from 'react';
import { motion } from 'motion/react';
import { ScrollReveal } from './ScrollReveal';

export const FounderMountainQuote: React.FC = () => {
  return (
    <section className="relative py-44 px-6 overflow-hidden bg-white dark:bg-black transition-colors duration-300">
      {/* Mountain Background - Full fit, no fading */}
      <ScrollReveal className="absolute inset-0 z-0">
        <div 
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.openai.com/static-rsc-4/nX08YhMXYFWxKY3XwFtovR08RkRev_rcJSH0WKmR4Khxx0JFkQck4TRqEdzLOuZoj-hUz3UH_L9jU2UuXa0uyEYY-Er6BgT7EUSO0sZzVI_ecmQp3DeZDgDp9G_uEddJSW7zdIOSu2C8VGj489lAdlavx21gkSwjRfTsKGkHiZjGHkqMCJlCNdewr6SgxWA-?purpose=fullsize)',
          }}
        />
      </ScrollReveal>
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl sm:text-6xl font-serif text-white leading-tight drop-shadow-lg"
        >
          “The World Is Still Becoming.”
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-lg sm:text-xl text-white font-medium drop-shadow-md"
        >
          — Magnus Verity, Founder of AI Workforce
        </motion.p>
      </div>
    </section>
  );
};
