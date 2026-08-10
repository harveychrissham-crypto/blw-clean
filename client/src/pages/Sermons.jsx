import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiFilm } from 'react-icons/fi';
import { fetchSermons } from '../utils/sermons';


/*
 * Sermon video player
 *
 * Videos are embedded directly from YouTube using
 * youtube-nocookie.com.
 */
function SermonPlayer({ sermon }) {
  if (!sermon?.youtubeId) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div className="aspect-video w-full">

        <iframe
          key={sermon.id}
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${sermon.youtubeId}`}
          title={sermon.title || 'Sermon'}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />

      </div>
    </div>
  );
}


export default function Sermons() {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await fetchSermons();

      setSermons(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {
      console.error('Unable to load sermons:', err);

      setError(
        err?.message ||
        'Unable to load sermons.'
      );

    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    load();
  }, [load]);


  /*
   * Featured sermon is selected by the admin.
   * If none is featured, use the first sermon.
   */
  const activeSermon =
    sermons.find(
      (sermon) => sermon.isFeatured
    ) ||
    sermons[0] ||
    null;


  const olderSermons =
    sermons.filter(
      (sermon) =>
        sermon.id !== activeSermon?.id
    );


  return (
    <section className="mx-auto max-w-6xl px-5 py-16">

      {/* PAGE TITLE */}

      <div className="mb-6">

        <p
          className="mb-3 text-xs font-bold uppercase tracking-widest"
          style={{ color: '#F2A31C' }}
        >
          Sermons
        </p>


        <h1
          className="text-3xl font-extrabold text-white sm:text-4xl"
          style={{
            fontFamily: 'Montserrat, sans-serif',
          }}
        >
          Sermons &amp; Teachings
        </h1>


        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
          Watch sermons and teachings from Believers' LoveWorld
          Campus Ministry.
        </p>

      </div>


      {/* LOADING */}

      {loading && (
        <div className="flex aspect-video max-w-lg items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sm text-white/40">
          Loading sermon…
        </div>
      )}


      {/* ERROR */}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">

          <FiAlertCircle className="h-4 w-4 shrink-0" />

          <span>{error}</span>

        </div>
      )}


      {/* NO SERMONS */}

      {!loading && !error && !activeSermon && (
        <div className="flex aspect-video max-w-lg flex-col items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] text-white/40">

          <FiFilm className="h-8 w-8" />

          <p className="text-sm">
            No sermons have been added yet.
          </p>

        </div>
      )}


      {/* FEATURED SERMON */}

      {!loading && activeSermon && (
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-start"
        >

          {/* VIDEO */}

          <div className="w-full max-w-md lg:max-w-none">

            <SermonPlayer
              sermon={activeSermon}
            />

          </div>


          {/* DETAILS */}

          <div>

            <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/50">
              Featured Sermon
            </div>


            <h2
              className="text-2xl font-extrabold text-white sm:text-3xl"
              style={{
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {activeSermon.title}
            </h2>


            {activeSermon.speaker && (
              <p
                className="mt-1 text-sm font-semibold"
                style={{
                  color: '#F2A31C',
                }}
              >
                {activeSermon.speaker}
              </p>
            )}


            {activeSermon.description && (
              <p className="mt-3 text-sm leading-relaxed text-white/55">
                {activeSermon.description}
              </p>
            )}

          </div>

        </motion.div>
      )}


      {/* MORE SERMONS */}

      {olderSermons.length > 0 && (
        <div className="mt-12 space-y-10">

          <h3 className="text-sm font-bold uppercase tracking-widest text-white/50">
            More Sermons
          </h3>


          {olderSermons.map((sermon, index) => (

            <motion.div
              key={sermon.id}
              initial={{
                opacity: 0,
                y: 15,
              }}
              whileInView={{
                opacity: 1,
                y: 0,
              }}
              viewport={{
                once: true,
              }}
            >

              <SermonPlayer
                sermon={sermon}
              />


              <div className="mt-3">

                <p className="text-xs font-bold uppercase tracking-widest text-white/30">
                  Sermon {index + 2}
                </p>


                <h4 className="mt-1 text-lg font-bold text-white">
                  {sermon.title}
                </h4>


                {sermon.speaker && (
                  <p
                    className="mt-0.5 text-sm font-semibold"
                    style={{
                      color: '#F2A31C',
                    }}
                  >
                    {sermon.speaker}
                  </p>
                )}


                {sermon.description && (
                  <p className="mt-1 text-sm leading-relaxed text-white/50">
                    {sermon.description}
                  </p>
                )}

              </div>

            </motion.div>

          ))}

        </div>
      )}

    </section>
  );
}