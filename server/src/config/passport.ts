import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import dotenv from 'dotenv';
import User from '../models/User';

dotenv.config();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const configurePassport = (passport: passport.PassportStatic) => {
  // GitHub OAuth Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: '/api/auth/github/callback',
        scope: ['user:email', 'repo'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists in our database
          let user = await User.findOne({ githubId: profile.id });

          if (user) {
            // Update the GitHub access token
            user.githubToken = accessToken;
            await user.save();
            return done(null, user);
          }

          // If no user found, create a new user
          user = new User({
            githubId: profile.id,
            username: profile.username,
            displayName: profile.displayName || profile.username,
            email: profile.emails && profile.emails[0] ? profile.emails[0].value : '',
            avatarUrl: profile.photos && profile.photos[0] ? profile.photos[0].value : '',
            githubToken: accessToken,
            githubRefreshToken: refreshToken,
          });

          await user.save();
          return done(null, user);
        } catch (error) {
          return done(error as Error, false);
        }
      }
    )
  );

  // JWT Strategy for protected routes
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: JWT_SECRET,
      },
      async (jwtPayload, done) => {
        try {
          const user = await User.findById(jwtPayload.id);
          if (user) {
            return done(null, user);
          }
          return done(null, false);
        } catch (error) {
          return done(error as Error, false);
        }
      }
    )
  );
};
